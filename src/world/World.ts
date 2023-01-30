import { WorldBuilder } from './WorldBuilder';
import { Commands } from './Commands';
import { bits } from '../utils/bits';
import { Memory } from '../utils/memory';
import { Entities, Entity, Table, UncreatedEntitiesTable } from '../storage';
import { SEND_TABLE } from './channels';
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

	archetypeLookup = new Map<bigint, number>();
	archetypes = [] as Table[];

	queries = [] as Query<any, any>[];
	resources = new Map<Class, object>();

	systems = [] as ((...args: any[]) => any)[];
	arguments = [] as any[][];

	memory: Memory;
	commands: Commands;
	entities: Entities;

	config: WorldConfig;
	threads: ThreadGroup;
	executor: ExecutorInstance;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		executor: ExecutorType,
		components: Struct[],
		resourceTypes: Class[],
		systems: SystemDefinition[],
		dependencies: SystemDependencies[],
		channels: ThreadMessageChannel[],
	) {
		this.config = config;
		this.threads = threads;
		const buffer = this.threads.queue(() => {
			const mem = Memory.withSize(config.memory, config.threads > 1);
			return mem.views.buffer;
		});
		this.memory = Memory.fromBuffer(buffer);

		this.archetypeLookup.set(0n, 1);

		const recycledTable = Table.create(this, [Entity], 0n, 1);
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
			const resource = new Resource();
			this.resources.set(Resource, new Resource());
			if (isStruct(Resource) && Resource.size! > 0) {
				//@ts-ignore: __$$s exists.
				resource.__$$s = this.memory.views;
				//@ts-ignore: __$$b exists
				resource.__$$b = this.threads.queue(() =>
					this.memory.alloc(Resource.size!),
				);
			}
		}

		for (const system of systems) {
			this.systems.push(system.fn);
			this.arguments.push(
				system.parameters.map(p => p.intoArgument(this)),
			);
		}
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
		const id = this.archetypes.length;
		const table = Table.create(
			this,
			[...bits(tableId)].map(cid => this.components[cid]),
			tableId,
			id,
		);
		this.archetypeLookup.set(tableId, id);
		this.archetypes.push(table);

		this.threads.send(SEND_TABLE(table.pointer, id, tableId));
		for (const query of this.queries) {
			query.testAdd(tableId, table);
		}
		return table;
	}
}
