import { Commands } from '../commands';
import { Table, type Class } from '../components';
import { Entities, Entity } from '../entities';
import { DEV_ASSERT } from '../utils';
import type { System } from '../systems';
import type { Thread } from '../threads';

import { getCompleteConfig, type WorldConfig } from './config';
import { StartSchedule } from './schedules';
import { WorldBuilder } from './WorldBuilder';

type WorldEventListeners = {
	createTable: ((table: Table) => void)[];
};
export class World {
	/**
	 * Constructs and returns a new `WorldBuilder`.
	 * @param config The config of the world.
	 * @returns A `WorldBuilder`.
	 */
	static new(config?: Partial<WorldConfig>): WorldBuilder {
		return new WorldBuilder(getCompleteConfig(config));
	}

	#listeners: WorldEventListeners;

	tables: Table[];
	#archetypeToTable: Map<bigint, Table>;
	resources: object[];
	threads: Thread<any>[];

	schedules: Record<symbol, { systems: System[]; args: any[][] }>;

	commands: Commands;
	entities: Entities;
	config: Readonly<WorldConfig>;
	components: Class[];

	constructor(config: WorldConfig) {
		const entityLocations: number[] = [];
		this.config = config;
		this.#listeners = {
			createTable: [],
		};
		this.components = [Entity];
		this.tables = [Table.createEmpty(entityLocations)];
		this.#archetypeToTable = new Map([[0n, this.tables[0]]]);
		this.resources = [];
		this.threads = [];
		this.schedules = {};
		this.entities = new Entities(this, entityLocations);
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
	 * @param entity The entity to move.
	 * @param targetArchetype The archetype of the target table.
	 */
	moveEntity(entity: Entity, targetArchetype: bigint): void {
		if (!this.entities.isAlive(entity.id)) {
			return;
		}
		const [tableId, row] = this.entities.getLocation(entity);
		const currentTable = this.tables[tableId];
		if (currentTable.archetype !== targetArchetype) {
			currentTable.move(row, this.#getTable(targetArchetype));
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

	addEventListener<T extends keyof WorldEventListeners>(
		type: T,
		listener: WorldEventListeners[T][0],
	) {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		this.#listeners[type].push(listener);
	}

	removeEventListener(type: string, listener: Function) {
		const arr = (this.#listeners as Record<string, Function[]>)[type];
		arr.splice(arr.indexOf(listener), 1);
	}
}
