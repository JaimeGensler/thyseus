import WorldBuilder from './WorldBuilder';
import validateAndCompleteConfig, {
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type Thread from '../utils/Thread';
import type Executor from './Executor';
import type { System } from '../utilTypes';
import type { ResourceType } from '../Resources';
import type { ComponentType } from '../Components';
import WorldCommands from './WorldCommands';

export default class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	#components: Map<ComponentType, object>;
	#resources: Map<ResourceType, object>;
	#queries: Map<unknown, unknown>;
	#threads: Thread[];
	#systems: System[];
	#executor: Executor;
	#commands: WorldCommands;
	constructor(
		components: Map<ComponentType, object>,
		resources: Map<ResourceType, object>,
		queries: Map<unknown, unknown>,
		threads: Thread[],
		systems: System[],
		executor: Executor,
		commands: WorldCommands,
	) {
		this.#components = components;
		this.#resources = resources;
		this.#queries = queries;
		this.#systems = systems;
		this.#threads = threads;
		this.#executor = executor;
		this.#commands = commands;
		this.#executor.onReady(() => this.#runSystems());
	}

	get threads() {
		return this.#threads;
	}
	get resources() {
		return this.#resources;
	}
	get queries() {
		return this.#queries;
	}
	get components() {
		return this.#components;
	}
	get commands() {
		return this.#commands;
	}

	async update() {
		this.#executor.reset();
		this.#executor.start();
	}

	async #runSystems() {
		for await (const sid of this.#executor) {
			const system = this.#systems[sid];
			system.execute(...system.args);
		}
		this.#executor.onReady(() => this.#runSystems());
	}
}
