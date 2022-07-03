import SparseSet from '../DataTypes/SparseSet';
import World from './World';
import Thread from '../utils/Thread';
import Mutex from '../DataTypes/Mutex';
import BigUintArray from '../DataTypes/BigUintArray';
import Executor from './Executor/MultiExecutor';
import {
	QueryParameter,
	ResourceParameter,
	EntitiesParameter,
	type SystemDefinition,
	type Parameter,
} from '../Systems';
import type { WorldConfig } from './config';
import type { System } from '../utilTypes';

Thread.globalSendableTypes = [SparseSet, Mutex, BigUintArray, Executor];

export default class ThreadWorldBuilder {
	#systems: SystemDefinition[] = [];
	#parameters: Parameter[];

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		this.#config = config;
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
		this.#processSystem(system);
		return this;
	}

	async build(): Promise<World> {
		for (const parameter of this.#parameters) {
			if (parameter.receiveOnThread) {
				parameter.receiveOnThread(await Thread.receive());
			}
		}
		const executor = await Thread.receive<Executor>();

		const systems = this.#systems.map(system => this.#buildSystem(system));

		const world = new World(systems, {} as any, [], executor, new Set());
		Thread.send(0);
		return world;
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
