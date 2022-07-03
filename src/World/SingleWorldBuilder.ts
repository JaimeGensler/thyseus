import World from './World';
import { SingleExecutor } from './Executor';
import {
	QueryParameter,
	ResourceParameter,
	EntitiesParameter,
	type Parameter,
} from '../Systems';
import validateWorldConfig, { type WorldConfig } from './config';
import type { SystemDefinition } from '../Systems';
import type { System } from '../utilTypes';

export default class SingleWorldBuilder {
	#systems: SystemDefinition[] = [];
	#startupSystems: SystemDefinition[] = [];
	#parameters: Parameter[];

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		validateWorldConfig(config, undefined);
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

		const executor = new SingleExecutor(
			Array.from({ length: systems.length }, (_, i) => i),
		);

		for (const { execute, args } of starters) {
			execute(...args);
		}

		return new World(
			systems,
			this.#parameters.find(
				x => x instanceof EntitiesParameter,
				//@ts-ignore
			)!.entityManager,
			[],
			executor as any,
			new Set(),
		);
	}

	#processSystem(system: SystemDefinition): void {
		for (const descriptor of system.parameters!) {
			for (const parameter of this.#parameters) {
				if (parameter.recognizesDescriptor(descriptor)) {
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
				const parameter = this.#parameters.find(p =>
					p.recognizesDescriptor(descriptor),
				);
				if (!parameter) {
					throw new Error('Unrecognized parameter.');
				}
				return parameter.onBuildSystem(descriptor);
			}),
		};
	}
}
