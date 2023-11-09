import { Commands } from '../commands';
import { Table, type Class } from '../components';
import { Entities, Entity } from '../entities';
import { DEV_ASSERT } from '../utils';

import { getCompleteConfig, type WorldConfig } from './config';
import { Schedule, type ScheduleType } from './Schedule';
import { WorldBuilder } from './WorldBuilder';
import type { WorldEventListeners } from './WorldEventListeners';

/**
 * A container for data and data-types used by an application.
 * Contains entities and their component data, resources, schedules and more.
 */
export class World {
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @returns A `WorldBuilder`.
	 */
	static new(config?: Partial<WorldConfig>): WorldBuilder {
		return new WorldBuilder(getCompleteConfig(config));
	}

	/**
	 * The event listeners for this world.
	 */
	#listeners: WorldEventListeners;
	/**
	 * A lookup for archetypes (`bigint`s) to tables.
	 */
	#archetypeToTable: Map<bigint, Table>;
	/**
	 * A list of tables in the world.
	 * Tables group entities with the same components together.
	 */
	tables: Table[];
	/**
	 * A list of resources in the world.
	 */
	resources: object[];
	/**
	 * The schedules that exist in this world.
	 */
	schedules: Map<ScheduleType, Schedule>;
	/**
	 * This world's `Commands` object.
	 */
	commands: Commands;
	/**
	 * This world's `Entities` object.
	 */
	entities: Entities;
	/**
	 * The config used to create this world.
	 */
	config: Readonly<WorldConfig>;
	/**
	 * A list of components currently used by this world.
	 */
	components: Class[];

	constructor(config: WorldConfig, listeners: WorldEventListeners) {
		this.config = config;
		this.#listeners = listeners;

		const entityLocations: number[] = [];
		this.components = [Entity];
		this.tables = [Table.createEmpty(entityLocations)];
		this.#archetypeToTable = new Map([[0n, this.tables[0]]]);
		this.resources = [];
		this.schedules = new Map();
		this.entities = new Entities(this, entityLocations);
		this.commands = new Commands(this);
	}

	/**
	 * Emits the `"start"` event in this world.
	 */
	start(): void {
		for (const listener of this.#listeners.start) {
			listener(this);
		}
	}
	/**
	 * Emits the `"stop"` event in this world.
	 */
	stop(): void {
		for (const listener of this.#listeners.stop) {
			listener(this);
		}
	}

	/**
	 * Runs the specified schedule.
	 * Throws if that schedule cannot be found.
	 * @param schedule The schedule to run.
	 * @returns A promise that resolves when the schedule has completed
	 */
	async runSchedule(scheduleType: ScheduleType): Promise<void> {
		DEV_ASSERT(
			this.schedules.has(scheduleType),
			`Could not find schedule (${String(
				scheduleType.name,
			)}) in the world!`,
		);
		const schedule = this.schedules.get(scheduleType)!;
		schedule.run();
	}

	/**
	 * Returns the resource of the provided type, or `undefined` if it doesn't exist.
	 * @param resourceType The type of the resource to get
	 * @returns The resource instance.
	 */
	getResource<T extends Class>(resourceType: T): InstanceType<T> | undefined {
		return this.resources.find(
			res => res.constructor === resourceType,
		) as any;
	}

	/**
	 * Returns the resource (instance) of the passed type, creating and adding it to the world if it doesn't exist yet.
	 * @param resourceType The type of the resource to get or create.
	 * @returns The resource instance.
	 */
	async getOrCreateResource<T extends Class>(
		resourceType: T,
	): Promise<InstanceType<T>> {
		const res = this.getResource(resourceType);
		if (res) {
			return res;
		}
		this.resources.push(
			'fromWorld' in resourceType
				? await (resourceType as any).fromWorld(this)
				: new resourceType(),
		);
		return this.resources.at(-1) as InstanceType<T>;
	}

	/**
	 * Moves an entity from one table to another.
	 * @param entity The entity to move.
	 * @param targetArchetype The archetype of the target table.
	 */
	moveEntity(entity: Entity, targetArchetype: bigint): void {
		if (!entity.isAlive) {
			return;
		}
		const [tableId, row] = this.entities.getLocation(entity);
		const currentTable = this.tables[tableId];
		if (currentTable.archetype !== targetArchetype) {
			currentTable.move(row, this.#getTable(targetArchetype));
		}
		if (targetArchetype === 0n) {
			Entity.despawn(entity);
		}
	}

	/**
	 * Gets the internal id for a component in this world.
	 * If the provided component type doesn't yet have an id in this world, an id will be reserved.
	 * @param componentType The component type to get an id for.
	 * @returns The numeric id of the component.
	 */
	getComponentId(componentType: Class): number {
		const componentId = this.components.indexOf(componentType);
		if (componentId !== -1) {
			return componentId;
		}
		this.components.push(componentType);
		return this.components.length - 1;
	}

	/**
	 * Returns the matching archetype (bigint) for a set of components.
	 * @param ...componentTypes The components to get an archetype for.
	 * @returns The archetype for this set of components.
	 */
	getArchetype(...componentTypes: Class[]): bigint {
		let result = 1n;
		for (const componentType of componentTypes) {
			result |= 1n << BigInt(this.getComponentId(componentType));
		}
		return result;
	}

	/**
	 * Given an archetype (`bigint)`, returns the array of components that matches this archetype.
	 * @param archetype The archetype to get components for
	 * @returns An array of components (`Class[]`).
	 */
	getComponentsForArchetype(archetype: bigint): Class[] {
		const components = [];
		let temp = archetype;
		let i = 0;
		while (temp !== 0n) {
			if ((temp & 1n) === 1n) {
				components.push(this.components[i]);
			}
			temp >>= 1n;
			i++;
		}
		return components;
	}

	/**
	 * Gets this world's table for the provided archetype.
	 * If it doesn't exist, creates the table and returns it.
	 * @param archetype The archetype for the table to find.
	 * @returns The table matching the provided archetype.
	 */
	#getTable(archetype: bigint): Table {
		let table = this.#archetypeToTable.get(archetype);
		if (table) {
			return table;
		}

		table = new Table(
			this.getComponentsForArchetype(archetype),
			archetype,
			this.tables.length,
			this.entities.locations,
		);
		this.tables.push(table);
		this.#archetypeToTable.set(archetype, table);
		for (const listener of this.#listeners.createTable) {
			listener(table);
		}
		return table;
	}

	/**
	 * Adds a listener for a specific event to the world.
	 * @param type The type of event to listen to.
	 * @param listener The callback to be run when this event is emitted.
	 */
	addEventListener<T extends keyof WorldEventListeners>(
		type: T,
		listener: WorldEventListeners[T][0],
	): void {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		this.#listeners[type].push(listener as any);
	}

	/**
	 * Removes a listener for an event from the world.
	 * @param type The type of event to remove a listener from.
	 * @param listener The callback to be removed.
	 */
	removeEventListener(type: string, listener: Function): void {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		const arr = (this.#listeners as Record<string, Function[]>)[type];
		arr.splice(arr.indexOf(listener), 1);
	}
}
