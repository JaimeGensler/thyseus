import { bits, DEV_ASSERT, Memory } from '../utils';
import { WorldBuilder, type Registry } from './WorldBuilder';
import { Commands } from '../commands';
import { Entities, Table } from '../storage';
import { EventReader, EventWriter } from '../events';
import {
	ComponentRegistryKey,
	EventRegistryKey,
	ResourceRegistryKey,
} from './registryKeys';
import { StartSchedule, type ExecutorInstance } from '../schedule';
import { isStruct, type Class, type Struct } from '../struct';
import {
	validateAndCompleteConfig,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type { ThreadGroup } from '../threads';
import type { Query } from '../queries';

export class World {
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @returns A `WorldBuilder`.
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
	#archetypeToTable: Map<bigint, Table> = new Map<bigint, Table>();
	queries: Query<any, any>[] = [];
	resources: object[] = [];
	eventReaders: EventReader<any>[] = [];
	eventWriters: EventWriter<any>[] = [];

	schedules: Record<symbol, ExecutorInstance> = {};

	registry: Registry;
	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	threads: ThreadGroup;
	components: Struct[];
	constructor(config: WorldConfig, threads: ThreadGroup, registry: Registry) {
		this.config = config;
		this.threads = threads;
		this.registry = registry;

		// Components are sorted by alignment (largest -> smallest) so we can
		// create "default" data for all of them without needing to pad any.
		this.components = [...registry.get(ComponentRegistryKey)!].sort(
			(a, z) => z.alignment! - a.alignment!,
		);

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
		this.commands = new Commands(this);

		const eventTypes = registry.get(EventRegistryKey)! as Set<Struct>;
		let eventsPointer = this.threads.queue(() =>
			Memory.alloc(EventReader.size * eventTypes.size),
		);
		for (const eventType of eventTypes) {
			const id = this.eventReaders.length;
			this.eventReaders.push(
				new EventReader(this.commands, eventType, eventsPointer, id),
			);
			this.eventWriters.push(
				new EventWriter(this.commands, eventType, eventsPointer, id),
			);
			eventsPointer += EventReader.size;
		}

		const resourceTypes = registry.get(ResourceRegistryKey)! as Set<Class>;
		for (const resourceType of resourceTypes) {
			if (isStruct(resourceType)) {
				const res = new resourceType();
				(res as any).__$$b = this.threads.queue(() =>
					resourceType.size! !== 0
						? Memory.alloc(resourceType.size!)
						: 0,
				);
				this.resources.push(res);
			} else if (threads.isMainThread) {
				this.resources.push(new resourceType());
			}
		}
	}

	/**
	 * Starts execution of the world.
	 */
	start(): void {
		DEV_ASSERT(
			StartSchedule in this.schedules,
			'Systems must be added to the StartSchedule to use world.start()!',
		);
		// Allow start() to be safely called from any thread
		if (this.threads.isMainThread) {
			this.schedules[StartSchedule].start();
		}
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
		if (currentTable.archetype === targetArchetype) {
			// No need to move, we're already there!
			return;
		}
		const targetTable = this.#getTable(targetArchetype);
		if (targetTable.length === targetTable.capacity) {
			targetTable.grow(this.config.getNewTableSize(targetTable.capacity));
		}

		const row = this.entities.getRow(entityId);
		if (currentTable.archetype === 0n) {
			targetTable.add(entityId);
		} else {
			// If the moving entity is the last element, move() returns the id
			// of the entity that's moving tables. This means we set row for
			// that entity twice, but the last set will be correct.
			const backfilledEntity = currentTable.move(row, targetTable);
			this.entities.setRow(backfilledEntity, row);
		}
		if (targetArchetype === 0n) {
			this.entities.freeId(entityId);
		}

		this.entities.setTableId(entityId, targetTable.id);
		this.entities.setRow(entityId, targetTable.length - 1);
	}

	/**
	 * Gets the internal id for a component in this world.
	 * May differ from world to world.
	 * @param componentType The component type to get an id for.
	 * @returns The numeric id of the component.
	 */
	getComponentId(componentType: Struct): number {
		DEV_ASSERT(
			this.components.includes(componentType),
			`Tried to get id of unregistered component "${componentType.name}"`,
		);
		return this.components.indexOf(componentType);
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
