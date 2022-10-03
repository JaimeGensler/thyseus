import WorldBuilder from './WorldBuilder';
import Table from '../Components/Table';
import validateAndCompleteConfig, {
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type ThreadGroup from '../utils/Threads';
import type Executor from './Executor';
import type WorldCommands from './WorldCommands';
import type Entities from './Entities';
import type { System } from '../Systems';
import type { ResourceType } from '../Resources';

export default class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	#archetypes = new Map<bigint, Table>();

	#config: WorldConfig;
	#resources: Map<ResourceType, object>;
	#threads: ThreadGroup;
	#systems: System[];
	#executor: Executor;
	#commands: WorldCommands;
	#entities: Entities;
	constructor(
		config: WorldConfig,
		resources: Map<ResourceType, object>,
		threads: ThreadGroup,
		systems: System[],
		executor: Executor,
		commands: WorldCommands,
		entities: Entities,
	) {
		this.#config = config;
		this.#resources = resources;
		this.#threads = threads;
		this.#systems = systems;
		this.#executor = executor;
		this.#commands = commands;
		this.#entities = entities;

		this.#executor.onReady(() => this.#runSystems());
	}

	get config() {
		return this.#config;
	}
	get threads() {
		return this.#threads;
	}
	get resources() {
		return this.#resources;
	}
	get archetypes() {
		return this.#archetypes;
	}
	get commands() {
		return this.#commands;
	}

	moveEntity(entityId: bigint, tableId: bigint) {}

	// getTable(tableId: bigint): Table {
	// 	if (!this.#archetypes.has(tableId)) {
	// 		const table = Table.fromWorld();
	// 		this.#archetypes.set(tableId, table);
	// 	}
	// 	return this.#archetypes.get(tableId)!;
	// }
	// resizeTable(table: Table): void {}

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
