import { Table, type Class } from '../components';
import { Entity } from '../entities';
import { System } from '../systems';
import { DEV_ASSERT } from '../utils';

import { getCompleteConfig, type WorldConfig } from './config';
import { Schedule, type ScheduleType } from './Schedule';
import type { Plugin } from './Plugin';
import type { WorldEventListeners } from './WorldEventListeners';
import { Entities } from '../entities/Entities';

/**
 * The entry point for a Thyseus application.
 *
 * Contains data and types used by the app, such as entities, components, resources, and systems.
 */
export class World {
	static intoArgument(world: World): World {
		return world;
	}

	/**
	 * A list of tables in the world.
	 * Tables group entities with the same components together.
	 */
	tables: Table[] = [Table.createEmpty()];
	/**
	 * A list of resources in the world.
	 */
	resources: object[] = [];
	/**
	 * The schedules that exist in this world.
	 */
	schedules: Map<ScheduleType, Schedule> = new Map();
	/**
	 * A list of components currently used by this world.
	 */
	components: Class[] = [Entity];
	/**
	 * The entities handler for this world.
	 */
	entities: Entities = new Entities(this);

	/**
	 * A list of async plugins that have been started.
	 */
	#pendingPlugins: Promise<any>[] = [];
	/**
	 * A lookup for archetypes (`bigint`s) to tables.
	 */
	#archetypeToTable: Map<bigint, Table> = new Map([[0n, this.tables[0]]]);
	/**
	 * The event listeners for this world.
	 */
	#listeners: WorldEventListeners = {
		start: [],
		stop: [],
		createTable: [],
	};

	/**
	 * The config used to create this world.
	 */
	config: Readonly<WorldConfig>;
	constructor(config: Partial<WorldConfig> = {}) {
		this.config = getCompleteConfig(config);
	}

	/**
	 * Passes this `World` to the provided plugin function.
	 * @param plugin The plugin to add.
	 * @returns `this`, for chaining.
	 */
	addPlugin(plugin: Plugin): this {
		const result = plugin(this);
		if (result instanceof Promise) {
			this.#pendingPlugins.push(result);
		}
		return this;
	}

	/**
	 * Adds systems to the provided schedule.
	 * @param scheduleType The schedule **class** to add systems to.
	 * @param systems The system or systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(scheduleType: ScheduleType, systems: System | System[]): this {
		if (!this.schedules.has(scheduleType)) {
			this.schedules.set(scheduleType, new scheduleType(this));
		}
		this.schedules.get(scheduleType)?.addSystems(systems);
		return this;
	}

	/**
	 * Prepares the world by preparing all the system arguments for every schedule in the world.
	 * @returns `Promise<this>`, for chaining.
	 */
	async prepare(): Promise<this> {
		await Promise.all(this.#pendingPlugins);
		this.#pendingPlugins = [];
		for (const schedule of this.schedules.values()) {
			await schedule.prepare();
		}
		return this;
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
			`Could not find schedule "${String(
				scheduleType.name,
			)}" in the world!`,
		);
		if (this.config.entityUpdateTiming === 'before') {
			this.entities.update();
		}
		await this.schedules.get(scheduleType)!.run();
		if (this.config.entityUpdateTiming === 'after') {
			this.entities.update();
		}
	}

	/**
	 * Spawns a new entity in the world (alias for `world.entities.spawn()`).
	 * @returns The newly created `Entity`
	 */
	spawn(): Entity {
		return this.entities.spawn();
	}

	/**
	 * Returns the resource of the provided type, creating it if it doesn't yet exist.
	 * @param resourceType The type of the resource to get
	 * @returns The resource instance.
	 */
	async getResource<T extends Class>(
		resourceType: T,
	): Promise<InstanceType<T>> {
		let res = this.resources.find(r => r.constructor === resourceType) as
			| InstanceType<T>
			| undefined;
		if (res) {
			return res;
		}
		res =
			'fromWorld' in resourceType
				? await (resourceType as any).fromWorld(this)
				: new resourceType();
		DEV_ASSERT(
			res !== undefined,
			`${resourceType.name}.fromWorld() returned undefined; expected an object.`,
		);
		this.resources.push(res);
		return res;
	}

	/**
	 * Inserts the provided object as a resource into the world.
	 * If a resource of the same type already exists, the provided value will override that resource.
	 * @param `resource` The resource object to insert.
	 * @returns `this`, for chaining.
	 */
	insertResource(resource: object): this {
		const resourceIndex = this.resources.findIndex(
			res => res.constructor === resource.constructor,
		);
		if (resourceIndex === -1) {
			this.resources.push(resource);
		} else {
			this.resources[resourceIndex] = resource;
		}
		return this;
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
	 * Gets a table for the provided archetype.
	 * If it doesn't exist, creates the table.
	 * @param archetype The archetype for the table to find.
	 * @returns The table matching the provided archetype.
	 */
	getTable(archetype: bigint): Table {
		let table = this.#archetypeToTable.get(archetype);
		if (table) {
			return table;
		}
		table = new Table(
			this.getComponentsForArchetype(archetype),
			archetype,
			this.tables.length,
		);
		this.tables.push(table);
		this.#archetypeToTable.set(archetype, table);
		for (const listener of this.#listeners.createTable) {
			listener(table);
		}
		return table;
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
	 * Adds a listener for a specific event to the world.
	 * @param type The type of event to listen to.
	 * @param listener The callback to be run when the event is emitted.
	 */
	addEventListener<T extends keyof WorldEventListeners>(
		type: T,
		listener: WorldEventListeners[T][0],
	): this {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		this.#listeners[type].push(listener as any);
		return this;
	}

	/**
	 * Removes a listener for an event from the world.
	 * @param type The type of event to remove a listener from.
	 * @param listener The callback to be removed.
	 */
	removeEventListener<T extends keyof WorldEventListeners>(
		type: T,
		listener: WorldEventListeners[T][0],
	): this {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		const arr = this.#listeners[type];
		arr.splice(arr.indexOf(listener as any), 1);
		return this;
	}
}
