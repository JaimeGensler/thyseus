import { WorldBuilder } from './WorldBuilder';
import { Commands } from '../commands';
import { bits } from '../utils/bits';
import { memory } from '../utils/memory';
import { Entities, Table } from '../storage';
import { SEND_TABLE } from './channels';
import { EventReader, EventWriter } from '../events';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ExecutorInstance, ExecutorType } from '../executors';
import type { ThreadGroup, ThreadMessageChannel } from '../threads';
import type { SystemDefinition, SystemDependencies } from '../systems';
import type { Query } from '../queries';

export class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	archetypes: Table[] = [];
	#archetypeLookup = new Map<bigint, Table>();
	queries: Query<any, any>[] = [];
	resources: object[] = [];
	eventReaders: EventReader<any>[] = [];
	eventWriters: EventWriter<any>[] = [];

	systems: ((...args: any[]) => any)[] = [];
	arguments: any[][] = [];

	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	threads: ThreadGroup;
	executor: ExecutorInstance;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		executor: ExecutorType,
		components: Struct[],
		resourceTypes: Class[],
		eventTypes: Struct[],
		systems: SystemDefinition[],
		dependencies: SystemDependencies[],
		channels: ThreadMessageChannel[],
	) {
		this.config = config;
		this.threads = threads;

		memory.init(
			this.threads.queue(() =>
				memory.init(config.memory, config.threads > 1),
			),
		);

		const emptyTable = Table.createEmptyTable(this);
		const recycledTable = Table.createRecycledTable(this);
		this.archetypes.push(emptyTable, recycledTable);
		this.#archetypeLookup.set(0n, recycledTable);

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

		for (const eventType of eventTypes) {
			const pointer = this.threads.queue(() => {
				const ptr = memory.alloc(12 + eventType.size!);
				memory.views.u8.set(
					(new eventType() as any).__$$s.u8,
					ptr + 12,
				);
				return ptr;
			});
			this.eventReaders.push(
				new EventReader(this.commands, eventType, pointer),
			);
			this.eventWriters.push(
				new EventWriter(this.commands, eventType, pointer),
			);
		}

		for (const Resource of resourceTypes) {
			if (!isStruct(Resource) && !threads.isMainThread) {
				continue;
			}
			const resource = new Resource();
			this.resources.push(resource);
			if (isStruct(Resource) && Resource.size! > 0) {
				(resource as any).__$$s = memory.views;
				(resource as any).__$$b = this.threads.queue(() =>
					memory.alloc(Resource.size!),
				);
			}
		}
	}

	async update(): Promise<void> {
		return this.executor.start();
	}

	moveEntity(entityId: bigint, targetTableId: bigint): void {
		if (!this.entities.isAlive(entityId)) {
			return;
		}
		const currentTable =
			this.archetypes[this.entities.getTableIndex(entityId)];
		const targetTable = this.#getTable(targetTableId);

		const row = this.entities.getRow(entityId);
		const backfilledEntity = currentTable.move(row, targetTable);

		this.entities.setRow(backfilledEntity, row);
		this.entities.setTableIndex(entityId, targetTable.id);
		this.entities.setRow(entityId, targetTable.size - 1);
	}

	#getTable(tableId: bigint): Table {
		let table = this.#archetypeLookup.get(tableId);
		if (table) {
			return table;
		}
		const id = this.archetypes.length;
		table = Table.create(
			this,
			Array.from(bits(tableId), cid => this.components[cid]),
			tableId,
			id,
		);
		this.#archetypeLookup.set(tableId, table);
		this.archetypes.push(table);

		this.threads.send(SEND_TABLE(table.pointer, id, tableId));
		for (const query of this.queries) {
			query.testAdd(tableId, table);
		}
		return table;
	}
}
