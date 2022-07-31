import World from './World';
import Thread from '../utils/Thread';
import { MultiExecutor } from './Executor';
import isSystemLocalToThread from '../Systems/isSystemLocalToThread';
import getSendableTypes from './getSendableTypes';
import {
	QueryParameter,
	ResourceParameter,
	EntitiesParameter,
	getSystemDependencies,
	getSystemIntersections,
	type Dependencies,
	type Parameter,
	type SystemDefinition,
} from '../Systems';
import validateWorldConfig, { type WorldConfig } from './config';
import type { System } from '../utilTypes';

export default class WorldBuilder {
	#systemDependencies: (Dependencies | undefined)[] = [];
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

	addSystem(system: SystemDefinition, dependencies?: Dependencies): this {
		this.#systems.push(system);
		this.#systemDependencies.push(dependencies);
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

		const intersections = getSystemIntersections(
			this.#systems,
			this.#parameters,
		);
		const dependencies = getSystemDependencies(
			this.#systems,
			this.#systemDependencies,
			intersections,
		);
		const executor = MultiExecutor.from(intersections, dependencies);

		const sendable = getSendableTypes(this.#parameters);
		if (this.#config.threads > 1) {
			for (let i = 1; i < this.#config.threads; i++) {
				const thread = new Thread(this.#workerURL!, sendable);
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
		await Promise.all(this.#threads.map(thread => thread.receive<0>()));

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
		for (const descriptor of system.parameters) {
			for (const parameter of this.#parameters) {
				if (parameter.type === descriptor.type) {
					parameter.onAddSystem?.(descriptor);
					break;
				}
			}
		}
	}

	#buildSystem({ fn, parameters }: SystemDefinition): System {
		return {
			execute: fn,
			args: parameters.map((descriptor: any) => {
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
