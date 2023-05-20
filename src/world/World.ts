import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { WorldBuilder } from './WorldBuilder';
import { Commands } from '../commands';
import { bits } from '../utils/bits';
import { Memory } from '../utils/Memory';
import { Entities, Table } from '../storage';
import { EventReader, EventWriter } from '../events';
import { createManagedStruct } from '../storage/initStruct';
import { CoreSchedule } from '../schedule';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ExecutorInstance } from '../schedule/executors';
import type { ThreadGroup } from '../threads';
import type { Query } from '../queries';

export class World {
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @returns A `WorldBuilder`
	 */
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @param url The url to provide to workers. **This should always be `import.meta.url`.**
	 * @returns A `WorldBuilder`.
	 */
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config?: Partial<WorldConfig>,
		url?: string | URL,
	): WorldBuilder {
		return new WorldBuilder(validateAndCompleteConfig(config, url), url);
	}

	tables: Table[] = [];
	#archetypeToTable = new Map<bigint, Table>();
	queries: Query<any, any>[] = [];
	resources: object[] = [];
	eventReaders: EventReader<any>[] = [];
	eventWriters: EventWriter<any>[] = [];

	schedules: Record<symbol, ExecutorInstance> = {};

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
	) {
		this.config = config;
		this.threads = threads;
		this.components = components;

		Memory.init(
			this.threads.queue(() =>
				Memory.init(
					config.memorySize,
					config.useSharedMemory || config.threads > 1,
				),
			),
		);

		const emptyTable = Table.createEmpty();
		this.tables.push(emptyTable);
		this.#archetypeToTable.set(0n, emptyTable);

		this.entities = new Entities(this);
		this.commands = Commands.fromWorld(this);

		for (const eventType of eventTypes) {
			const pointer = this.threads.queue(() => {
				const ptr = Memory.alloc(12 + eventType.size!);
				if (eventType.size !== 0) {
					const instance = new eventType() as { __$$b: number };
					Memory.copy(instance.__$$b, eventType.size!, ptr + 12);
					Memory.free(instance.__$$b);
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
						? Memory.alloc(resourceType.size!)
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
	 * @param resourceType The type of the resource to get.
	 * @returns The resource instance.
	 */
	getResource<T extends Class>(resourceType: T): InstanceType<T> {
		return this.resources.find(
			instance => instance.constructor === resourceType,
		)! as any;
	}

	/**
	 * Moves an entity from one table to another.
	 * @param entityId The id of the entity to move.
	 * @param targetArchetype The archetype of the target table.
	 */
	moveEntity(entityId: bigint, targetArchetype: bigint): void {
		if (!this.entities.isAlive(entityId)) {
			return;
		}

		const currentTable = this.tables[this.entities.getTableId(entityId)];
		const targetTable = this.#getTable(targetArchetype);

		if (targetTable.length === targetTable.capacity) {
			targetTable.grow(this.config.getNewTableSize(targetTable.capacity));
		}

		const row = this.entities.getRow(entityId);

		// If the moving entity is the last element, move() returns the id of
		// the entity that's moving tables. This means we set row for that
		// entity twice, but the last set will be correct.
		const backfilledEntity = currentTable.move(row, targetTable);
		if (backfilledEntity !== null) {
			this.entities.setRow(backfilledEntity, row);
		}

		if (targetArchetype === 0n) {
			this.entities.freeId(entityId);
		}

		this.entities.setTableId(entityId, targetTable.id);
		this.entities.setRow(entityId, targetTable.length - 1);
	}

	#getTable(archetype: bigint): Table {
		let table = this.#archetypeToTable.get(archetype);
		if (table) {
			return table;
		}
		table = new Table(
			Array.from(bits(archetype), cid => this.components[cid]),
			archetype,
			this.tables.length,
		);
		this.tables.push(table);
		this.#archetypeToTable.set(archetype, table);

		for (const query of this.queries) {
			query.testAdd(table);
		}
		return table;
	}
}
