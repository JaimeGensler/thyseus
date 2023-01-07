import { WorldBuilder } from './WorldBuilder';
import { Commands } from './Commands';
import { bits } from '../utils/bits';
import {
	createStore,
	Entities,
	Entity,
	Table,
	UncreatedEntitiesTable,
} from '../storage';
import { RESIZE_TABLE, RESIZE_TABLE_LENGTHS, SEND_TABLE } from './channels';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ExecutorInstance, ExecutorType } from '../Executor';
import type { ThreadGroup, ThreadMessageChannel } from '../threads';
import type { Dependencies, SystemDefinition } from '../Systems';
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

	archetypeLookup = new Map<bigint, number>();
	tableLengths: Uint32Array;
	archetypes = [] as Table[];

	queries = [] as Query<any, any>[];
	resources = new Map<Class, object>();

	systems = [] as ((...args: any[]) => any)[];
	arguments = [] as any[][];

	executor: ExecutorInstance;
	commands: Commands;
	entities: Entities;
	config: WorldConfig;
	threads: ThreadGroup;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		executor: ExecutorType,
		components: Struct[],
		resourceTypes: Class[],
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
		channels: ThreadMessageChannel[],
	) {
		this.#bufferType = config.threads > 1 ? SharedArrayBuffer : ArrayBuffer;

		this.config = config;
		this.threads = threads;

		this.tableLengths = this.threads.queue(
			() =>
				new Uint32Array(
					this.createBuffer(
						TABLE_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT,
					),
				),
		);
		this.archetypeLookup.set(0n, 1);

		const recycledTable = Table.create(this, [Entity], 0n, 1);
		recycledTable.columns.set(
			Entity,
			this.threads.queue(() => recycledTable.columns.get(Entity)!),
		);
		this.archetypes.push(new UncreatedEntitiesTable(this), recycledTable);

		for (const channel of channels) {
			this.threads.setListener(
				channel.channelName,
				channel.onReceive(this),
			);
		}

		this.components = components;
		this.entities = Entities.fromWorld(this);
		this.commands = Commands.fromWorld(this);
		this.executor = executor.fromWorld(this, systems, dependencies);

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

		for (const { fn, parameters } of systems) {
			this.systems.push(fn);
			this.arguments.push(parameters.map(p => p.intoArgument(this)));
		}
	}

	/**
	 * Creates a buffer of the specified byte length.
	 * Returns a SharedArrayBuffer if multithreading, and a normal ArrayBuffer if not.
	 */
	createBuffer(byteLength: number): ArrayBufferLike {
		return new this.#bufferType(byteLength);
	}

	async update() {
		return this.executor.start();
	}

	moveEntity(entityId: bigint, targetTableId: bigint) {
		if (!this.entities.isAlive(entityId)) {
			return;
		}
		const currentTable =
			this.archetypes[this.entities.getTableIndex(entityId)];
		const targetTable = this.#getTable(targetTableId);

		if (targetTable.isFull) {
			this.#resizeTable(targetTable);
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
		if (this.archetypeLookup.has(tableId)) {
			return this.archetypes[this.archetypeLookup.get(tableId)!];
		}
		if (this.archetypes.length === this.tableLengths.length) {
			const oldLengths = this.tableLengths;
			this.tableLengths = new Uint32Array(
				this.createBuffer(
					oldLengths.length +
						TABLE_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT,
				),
			);
			this.tableLengths.set(oldLengths);
			this.threads.send(RESIZE_TABLE_LENGTHS(this.tableLengths));
		}
		const id = this.archetypes.length;
		const table = Table.create(
			this,
			[...bits(tableId)].map(cid => this.components[cid]),
			tableId,
			id,
		);
		this.archetypeLookup.set(tableId, id);
		this.archetypes.push(table);

		this.threads.send(
			SEND_TABLE(
				[...table.columns.values()],
				table.capacity,
				id,
				tableId,
			),
		);
		for (const query of this.queries) {
			query.testAdd(tableId, table);
		}
		return table;
	}

	#resizeTable(table: Table) {
		table.grow(this);
		this.threads.send(
			RESIZE_TABLE(table.id, table.capacity, [...table.columns.values()]),
		);
	}
}
