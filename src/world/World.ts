import { WorldBuilder } from './WorldBuilder';
import { Commands } from '../commands';
import { bits } from '../utils/bits';
import { memory } from '../utils/memory';
import { Entities, Table } from '../storage';
import { EventReader, EventWriter } from '../events';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ExecutorInstance, ExecutorType } from '../schedule/executors';
import type { ThreadGroup, ThreadMessageChannel } from '../threads';
import type { SystemDefinition, SystemDependencies } from '../systems';
import type { Query } from '../queries';
import { createManagedStruct } from '../storage/initStruct';
import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { CoreSchedule } from '../schedule';

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

	schedules: Record<symbol, ExecutorInstance>;

	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	threads: ThreadGroup;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		components: Struct[],
		resourceTypes: Class[],
		eventTypes: Struct[],
		channels: ThreadMessageChannel[],
		schedules: Record<symbol, SystemDefinition[]>,
		executors: Record<symbol, ExecutorType>,
	) {
		this.config = config;
		this.threads = threads;

		memory.init(
			this.threads.queue(() =>
				memory.init(
					config.memorySize,
					config.useSharedMemory || config.threads > 1,
				),
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

		this.schedules = Object.getOwnPropertySymbols(executors).reduce(
			(acc, key) => {
				acc[key] = executors[key].fromWorld(this, schedules[key], []);
				return acc;
			},
			{} as Record<symbol, ExecutorInstance>,
		);

		for (const eventType of eventTypes) {
			const pointer = this.threads.queue(() => {
				const ptr = memory.alloc(12 + eventType.size!);
				if (eventType.size !== 0) {
					const instance = new eventType() as { __$$b: number };
					memory.copy(instance.__$$b, eventType.size!, ptr + 12);
					memory.free(instance.__$$b);
				}
				return ptr;
			});
			this.eventReaders.push(
				new EventReader(this.commands, eventType, pointer),
			);
			this.eventWriters.push(
				new EventWriter(this.commands, eventType, pointer),
			);
		}

		for (const resourceType of resourceTypes) {
			if (isStruct(resourceType)) {
				const pointer = this.threads.queue(() =>
					resourceType.size! !== 0
						? memory.alloc(resourceType.size!)
						: 0,
				);
				this.resources.push(createManagedStruct(resourceType, pointer));
			} else if (threads.isMainThread) {
				this.resources.push(new resourceType());
			}
		}
	}

	/**
	 * Starts execution of the world.
	 */
	start(): void {
		this.schedules[CoreSchedule.Outer].start();
	}

	/**
	 * Runs the specified schedule.
	 * Throws if that schedule cannot be found.
	 * @param schedule The schedule to run.
	 * @returns A promise that resolves when the schedule has completed
	 */
	async runSchedule(schedule: symbol) {
		DEV_ASSERT(
			schedule in this.schedules,
			`Could not find schedule (${String(schedule)}) in the world!`,
		);
		return this.schedules[schedule].start();
	}

	/**
	 * Gets the resource (instance) of the passed type.
	 * Throws if the resource is not in the world.
	 * @param resourceType The type of the resource to get.
	 * @returns The resource instance.
	 */
	getResource<T extends Class>(resourceType: T): InstanceType<T> {
		DEV_ASSERT(
			this.resources.some(
				instance => instance.constructor === resourceType,
			),
			'Did not find resource in world. world.getResource() requires that the resource exist.',
		);
		return this.resources.find(
			instance => instance.constructor === resourceType,
		)! as any;
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
		this.entities.setRow(entityId, targetTable.length - 1);
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

		for (const query of this.queries) {
			query.testAdd(table);
		}
		return table;
	}
}
