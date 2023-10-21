import { Commands } from '../commands';
import { Table, type Class, type Struct } from '../components';
import { Entities, Entity } from '../entities';
import { DEV_ASSERT } from '../utils';
import type { Query } from '../queries';
import type { System } from '../systems';
import type { Thread } from '../threads';

import { getCompleteConfig, type WorldConfig } from './config';
import { StartSchedule } from './schedules';
import { WorldBuilder } from './WorldBuilder';

export class World {
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @returns A `WorldBuilder`.
	 */
	static new(config?: Partial<WorldConfig>): WorldBuilder {
		return new WorldBuilder(getCompleteConfig(config));
	}

	tables: Table[];
	#archetypeToTable: Map<bigint, Table>;
	queries: Query<any, any>[];
	resources: object[];
	threads: Thread<any>[];

	schedules: Record<symbol, { systems: System[]; args: any[][] }>;

	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	components: Struct[];
	constructor(config: WorldConfig) {
		this.config = config;

		this.components = [Entity];

		this.tables = [Table.createEmpty()];
		this.#archetypeToTable = new Map([[0n, this.tables[0]]]);
		this.queries = [];
		this.resources = [];
		this.threads = [];
		this.schedules = {};

		this.entities = new Entities(this);
		this.commands = new Commands(this);
	}

	/**
	 * Starts execution of the world.
	 */
	start(): void {
		this.runSchedule(StartSchedule);
	}

	/**
	 * Runs the specified schedule.
	 * Throws if that schedule cannot be found.
	 * @param schedule The schedule to run.
	 * @returns A promise that resolves when the schedule has completed
	 */
	async runSchedule(schedule: symbol): Promise<void> {
		DEV_ASSERT(
			schedule in this.schedules,
			`Could not find schedule (${String(schedule)}) in the world!`,
		);
		const { systems, args } = this.schedules[schedule];
		for (let i = 0; i < systems.length; i++) {
			await systems[i](...args[i]);
		}
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
		return (this.getResource(resourceType) ??
			this.resources[
				this.resources.push(
					'fromWorld' in resourceType
						? await (resourceType as any).fromWorld(this)
						: new resourceType(),
				) - 1
			]) as InstanceType<T>;
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

		const location = this.entities.getLocation(entityId);
		const { row, tableId } = location;
		const currentTable = this.tables[tableId];
		if (currentTable.archetype === targetArchetype) {
			// No need to move, we're already there!
			return;
		}
		const targetTable = this.#getTable(targetArchetype);
		if (targetTable.length === targetTable.capacity) {
			targetTable.resize(this.config.growStore(targetTable.capacity));
		}

		if (currentTable.archetype === 0n) {
			targetTable.add(entityId);
		} else {
			// If the moving entity is the last element, move() returns the id
			// of the entity that's moving tables. This means we set row for
			// that entity twice, but the last set will be correct.
			const backfilledEntity = currentTable.move(row, targetTable);
			this.entities.setLocation(
				backfilledEntity,
				location.set(currentTable.id, row),
			);
		}
		if (targetArchetype === 0n) {
			this.entities.freeId(entityId);
		}

		this.entities.setLocation(
			entityId,
			location.set(targetTable.id, targetTable.length - 1),
		);
	}

	/**
	 * Gets the internal id for a component in this world.
	 * If the provided component type doesn't yet have an id in this world, an id will be reserved.
	 * @param componentType The component type to get an id for.
	 * @returns The numeric id of the component.
	 */
	getComponentId(componentType: Struct): number {
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
	getArchetype(...componentTypes: Struct[]): bigint {
		let result = 0n;
		for (const componentType of componentTypes) {
			result |= 1n << BigInt(this.getComponentId(componentType));
		}
		return result;
	}

	/**
	 * Given an archetype (`bigint)`, returns the array of components that matches this archetype.
	 * @param archetype The archetype to get components for
	 * @returns An array of components (`Struct[]`).
	 */
	getComponentsForArchetype(archetype: bigint): Struct[] {
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
	 *
	 * @param archetype The archetype of the table to get.
	 * @returns
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
		);
		this.tables.push(table);
		this.#archetypeToTable.set(archetype, table);

		for (const query of this.queries) {
			query.testAdd(table);
		}
		return table;
	}
}
