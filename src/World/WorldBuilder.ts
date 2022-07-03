import SparseSet from '../DataTypes/SparseSet';
import World from './World';
import Thread from '../utils/Thread';
import getSystemIntersections from '../Systems/getSystemIntersections';
import Mutex from '../DataTypes/Mutex';
import BigUintArray from '../DataTypes/BigUintArray';
import Executor from './Executor/MultiExecutor';
import {
	QueryParameter,
	ResourceParameter,
	EntitiesParameter,
	type Parameter,
} from '../Systems';
import validateWorldConfig, { type WorldConfig } from './config';
import type { SystemDefinition } from '../Systems';
import type { System } from '../utilTypes';
import isSystemLocalToThread from '../Systems/isSystemLocalToThread';

const SHAREABLES = [SparseSet, Mutex, BigUintArray, Executor];

export default class WorldBuilder {
	#systems: SystemDefinition[] = [];
	#startupSystems: SystemDefinition[] = [];
	#parameters: Parameter[];
	#threads: Thread[] = [];

	#config: WorldConfig;
	#workerURL: string | URL | undefined;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		validateWorldConfig(config, url);
		this.#config = config;
		this.#workerURL = url;
		this.#parameters = [
			new QueryParameter(config),
			new ResourceParameter(config),
			new EntitiesParameter(config),
		];
	}

	addSystem(system: SystemDefinition): this {
		this.#systems.push(system);
		this.#processSystem(system);
		return this;
	}
	addStartupSystem(system: SystemDefinition): this {
		this.#startupSystems.push(system);
		this.#processSystem(system);
		return this;
	}

	async build(): Promise<World> {
		for (const parameter of this.#parameters) {
			parameter.onBuildMainWorld?.(
				this.#parameters.filter(p => p !== parameter),
			);
		}

		const systems = this.#systems.map(system => this.#buildSystem(system));
		const starters = this.#startupSystems.map(system =>
			this.#buildSystem(system),
		);

		const executor = Executor.from(
			getSystemIntersections(this.#systems, this.#parameters),
		);

		if (this.#config.threads > 1) {
			for (let i = 1; i < this.#config.threads; i++) {
				const thread = new Thread(this.#workerURL!, SHAREABLES);
				for (const parameter of this.#parameters) {
					if (parameter.sendToThread) {
						this.#threads.push(
							thread.send(parameter.sendToThread()),
						);
					}
				}
				thread.send(executor);
				this.#threads.push(thread);
			}
		}
		await Promise.all(this.#threads.map(thread => thread.receive()));

		for (const { execute, args } of starters) {
			execute(...args);
		}

		const local = new Set<number>();
		for (let i = 0; i < this.#systems.length; i++) {
			if (isSystemLocalToThread(this.#systems[i], this.#parameters)) {
				local.add(i);
			}
		}

		return new World(
			systems,
			this.#parameters.find(
				x => x instanceof EntitiesParameter,
				//@ts-ignore
			)!.entityManager,
			this.#threads,
			executor,
			local,
		);
	}

	#processSystem(system: SystemDefinition): void {
		for (const descriptor of system.parameters!) {
			for (const parameter of this.#parameters) {
				if (parameter.type === descriptor.type) {
					parameter.onAddSystem?.(descriptor);
					break;
				}
			}
		}
	}

	#buildSystem(system: SystemDefinition): System {
		return {
			execute: system,
			args: system.parameters!.map((descriptor: any) => {
				const parameter = this.#parameters.find(
					p => p.type === descriptor.type,
				);
				if (!parameter) {
					throw new Error('Unrecognized parameter.');
				}
				return parameter.onBuildSystem(descriptor);
			}),
		};
	}
}
