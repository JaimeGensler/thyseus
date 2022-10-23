import { WorldBuilder } from './WorldBuilder';
import { ComponentStore, ComponentType, Entity, Table } from '../Components';
import { bits } from '../utils/bits';
import { zipIntoMap } from '../utils/zipIntoMap';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ThreadGroup } from '../utils/ThreadGroup';
import type { Executor } from './Executor';
import type { WorldCommands } from './WorldCommands';
import type { Entities } from './Entities';
import type { System } from '../Systems';
import type { ResourceType } from '../Resources';
import type { Query } from '../Queries';

const NEW_TABLE = 'thyseus::newTable';
type NewTablePayload = [bigint, ComponentStore[], Uint32Array];

const GROW_TABLE = 'thyseus::growTable';
type GrowTablePayload = [bigint, ComponentStore[]];

export class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	archetypes = new Map<bigint, Table>();
	queries = [] as Query<any>[];

	config: WorldConfig;
	resources: Map<ResourceType, object>;
	threads: ThreadGroup;
	#systems: System[];
	#executor: Executor;
	commands: WorldCommands;
	entities: Entities;
	components: ComponentType[];
	constructor(
		config: WorldConfig,
		resources: Map<ResourceType, object>,
		threads: ThreadGroup,
		systems: System[],
		executor: Executor,
		commands: WorldCommands,
		entities: Entities,
		components: ComponentType[],
	) {
		this.config = config;
		this.resources = resources;
		this.threads = threads;
		this.#systems = systems;
		this.#executor = executor;
		this.commands = commands;
		this.entities = entities;
		this.components = components;

		this.threads.setListener<NewTablePayload>(
			NEW_TABLE,
			([tableId, stores, meta]) => {
				const columns = zipIntoMap(
					[...bits(tableId)].map(cid => this.components[cid]),
					stores,
				);
				const table = new Table(columns, meta);
				this.archetypes.set(tableId, table);
				for (const query of this.queries) {
					//@ts-ignore
					query.testAdd(tableId, table);
				}
			},
		);
		this.threads.setListener<GrowTablePayload>(
			GROW_TABLE,
			([tableId, stores]) => {
				const table = this.archetypes.get(tableId)!;
				let i = 0;
				for (const key of table.columns.keys()) {
					table.columns.set(key, stores[i++]);
				}
			},
		);

		this.#executor.onReady(() => this.#runSystems());
	}

	moveEntity(entityId: bigint, targetTableId: bigint) {
		const currentTableId = this.entities.getTableId(entityId);
		const currentTable = this.archetypes.get(currentTableId);
		if (targetTableId === 0n) {
			this.#deleteEntity(entityId);
			return;
		}

		const targetTable = this.#getTable(targetTableId);
		if (targetTable.isFull) {
			this.#resizeTable(targetTableId, targetTable);
		}

		if (currentTable) {
			this.entities.setLocation(
				currentTable.columns.get(Entity)![currentTable.size - 1],
				currentTableId,
				this.entities.getRow(entityId),
			);
			currentTable.move(this.entities.getRow(entityId), targetTable);
		} else {
			targetTable.add(entityId);
		}
		this.entities.setLocation(
			entityId,
			targetTableId,
			targetTable.size - 1,
		);
	}
	#deleteEntity(entityId: bigint) {
		const tableId = this.entities.getTableId(entityId);
		const table = this.archetypes.get(tableId);
		if (table) {
			const entityRow = this.entities.getRow(entityId);
			this.entities.setLocation(
				table.columns.get(Entity)?.val?.[table.size - 1],
				tableId,
				entityRow,
			);
			table.delete(this.entities.getRow(entityId));
		}
		this.entities.setLocation(entityId, 0n, 0);
	}

	#getTable(tableId: bigint): Table {
		if (!this.archetypes.has(tableId)) {
			const table = Table.create(
				[...bits(tableId)].map(cid => this.components[cid]),
				this.config.getNewTableSize(0),
			);
			this.threads.send<NewTablePayload>(NEW_TABLE, [
				tableId,
				[...table.columns.values()],
				table.meta,
			]);
			this.archetypes.set(tableId, table);
			for (const query of this.queries) {
				//@ts-ignore
				query.testAdd(tableId, table);
			}
		}
		return this.archetypes.get(tableId)!;
	}
	#resizeTable(tableId: bigint, table: Table) {
		table.grow(this.config);
		this.threads.send<GrowTablePayload>(GROW_TABLE, [
			tableId,
			[...table.columns.values()],
			table.meta,
		]);
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
