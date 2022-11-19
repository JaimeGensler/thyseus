import { WorldBuilder } from './WorldBuilder';
import { Executor } from './Executor';
import { WorldCommands } from './WorldCommands';
import { Entities } from './Entities';
import { bits } from '../utils/bits';
import { createStore, Table, Entity } from '../storage';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { SendableType, ThreadGroup } from '../utils/ThreadGroup';
import type { Dependencies, System, SystemDefinition } from '../Systems';
import type { Query } from '../Queries';

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
	#bufferType: ArrayBufferConstructor | SharedArrayBufferConstructor;

	config: WorldConfig;
	resources: Map<Class, object>;
	threads: ThreadGroup;
	systems: System[];
	#executor: Executor;
	commands: WorldCommands;
	entities: Entities;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		components: Struct[],
		resourceTypes: Class[],
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
		channels: Record<
			string,
			(world: World) => (data: SendableType) => SendableType
		>,
	) {
		this.#bufferType = config.threads > 1 ? SharedArrayBuffer : ArrayBuffer;

		this.config = config;
		this.threads = threads;

		for (const channel in channels) {
			this.threads.setListener(channel, channels[channel](this));
		}

		this.components = components;
		this.entities = Entities.fromWorld(this);
		this.commands = new WorldCommands(this.entities, this.components);

		this.#executor = Executor.fromWorld(this, systems, dependencies);

		this.resources = new Map<Class, object>();
		for (const Resource of resourceTypes) {
			if (isStruct(Resource)) {
				const store = threads.queue(() =>
					createStore(this, Resource, 1),
				);
				this.resources.set(
					Resource,
					new Resource(store, 0, this.commands),
				);
			} else if (threads.isMainThread) {
				this.resources.set(Resource, new Resource());
			}
		}

		const buildSystem = ({ fn, parameters }: SystemDefinition) => ({
			execute: fn,
			args: parameters.map(descriptor => descriptor.intoArgument(this)),
		});

		this.systems = systems.map(buildSystem);

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
				currentTable.columns.get(Entity)!.u64![currentTable.size - 1],
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

	createBuffer(byteLength: number): ArrayBufferLike {
		return new this.#bufferType(byteLength);
	}

	async update() {
		this.#executor.reset();
		this.#executor.start();
	}

	async #runSystems() {
		for await (const sid of this.#executor) {
			const system = this.systems[sid];
			await system.execute(...system.args);
		}
		this.#executor.onReady(() => this.#runSystems());
	}
	#deleteEntity(entityId: bigint) {
		const tableId = this.entities.getTableId(entityId);
		const table = this.archetypes.get(tableId);
		if (table) {
			const entityRow = this.entities.getRow(entityId);
			this.entities.setLocation(
				table.columns.get(Entity)!.u64![table.size - 1],
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
				this,
				[...bits(tableId)].map(cid => this.components[cid]),
			);
			this.threads.send('thyseus::newTable', [
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
		table.grow(this);
		this.threads.send('thyseus::growTable', [
			tableId,
			[...table.columns.values()],
			table.meta,
		]);
	}
}
