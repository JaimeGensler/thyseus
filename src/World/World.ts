import { WorldBuilder } from './WorldBuilder';
import { Executor } from './Executor';
import { WorldCommands } from './WorldCommands';
import { bits } from '../utils/bits';
import {
	createStore,
	Entities,
	Entity,
	Table,
	UncreatedEntitiesTable,
} from '../storage';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { SendableType, ThreadGroup } from '../utils/ThreadGroup';
import type { Dependencies, System, SystemDefinition } from '../Systems';
import type { Query } from '../Queries';

const TABLE_BATCH_SIZE = 64;

export class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	#bufferType: ArrayBufferConstructor | SharedArrayBufferConstructor;

	#archetypeLookup = new Map<bigint, number>();
	#tableLengths: Uint32Array;
	archetypes = [] as Table[];

	queries = [] as Query<any, any>[];

	executor: Executor;
	commands: WorldCommands;
	entities: Entities;

	config: WorldConfig;
	threads: ThreadGroup;
	components: Struct[];
	resources: Map<Class, object>;
	systems: System[];
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

		this.#tableLengths = this.threads.queue(
			() =>
				new Uint32Array(
					this.createBuffer(
						TABLE_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT,
					),
				),
		);
		this.#archetypeLookup.set(0n, 1);
		this.archetypes.push(
			new UncreatedEntitiesTable(),
			Table.create(this, [Entity], this.#tableLengths, 1),
		);

		for (const channel in channels) {
			this.threads.setListener(channel, channels[channel](this));
		}

		this.components = components;
		this.entities = Entities.fromWorld(this);
		this.commands = new WorldCommands(this.entities, this.components);

		this.executor = Executor.fromWorld(this, systems, dependencies);

		this.resources = new Map<Class, object>();
		for (const Resource of resourceTypes) {
			if (isStruct(Resource)) {
				const store = this.threads.queue(() =>
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

		this.systems = [];
		for (const { fn, parameters } of systems) {
			this.systems.push({
				execute: fn,
				args: parameters.map(p => p.intoArgument(this)),
			});
		}

		this.executor.onReady(() => this.#runSystems());
	}

	/**
	 * Creates a buffer of the specified byte length.
	 * Returns a SharedArrayBuffer if multithreading, and a normal ArrayBuffer if not.
	 */
	createBuffer(byteLength: number): ArrayBufferLike {
		return new this.#bufferType(byteLength);
	}

	async update() {
		this.executor.reset();
		this.executor.start();
	}
	async #runSystems() {
		for await (const sid of this.executor) {
			const system = this.systems[sid];
			await system.execute(...system.args);
		}
		this.executor.onReady(() => this.#runSystems());
	}

	moveEntity(entityId: bigint, targetTableId: bigint) {
		if (!this.entities.isAlive(entityId)) {
			return;
		}
		const currentTable =
			this.archetypes[this.entities.getTableIndex(entityId)];
		const targetTable = this.#getTable(targetTableId);

		if (targetTable.isFull) {
			this.#resizeTable(targetTableId, targetTable);
		}

		const row = this.entities.getRow(entityId);
		const backfilledEntity = currentTable.move(row, targetTable);
		if (targetTableId === 0n) {
			targetTable.incrementGeneration(row);
		}

		this.entities.setRow(backfilledEntity, row);
		this.entities.setTableIndex(entityId, targetTable.id);
		this.entities.setRow(entityId, targetTable.size - 1);
	}

	#getTable(tableId: bigint): Table {
		if (this.#archetypeLookup.has(tableId)) {
			return this.archetypes[this.#archetypeLookup.get(tableId)!];
		}
		if (this.archetypes.length === this.#tableLengths.length) {
			const oldLengths = this.#tableLengths;
			this.#tableLengths = new Uint32Array(
				this.createBuffer(
					oldLengths.length +
						TABLE_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT,
				),
			);
			this.#tableLengths.set(oldLengths);
			this.threads.send('thyseus::sendLengths', this.#tableLengths);
		}
		const id = this.archetypes.length++;
		const table = Table.create(
			this,
			[...bits(tableId)].map(cid => this.components[cid]),
			this.#tableLengths,
			id,
		);
		this.#archetypeLookup.set(tableId, id);
		this.archetypes.push(table);

		this.threads.send('thyseus::newTable', [
			tableId,
			[...table.columns.values()],
			{} as any,
		]);
		for (const query of this.queries) {
			query.testAdd(tableId, table);
		}
		return table;
	}

	#resizeTable(tableId: bigint, table: Table) {
		table.grow(this);
		this.threads.send('thyseus::growTable', [
			tableId,
			[...table.columns.values()],
			{} as any,
		]);
	}
}
