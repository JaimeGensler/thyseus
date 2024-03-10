import {
	isSizedComponent,
	isTagComponent,
	type Class,
	type TagComponentType,
} from '../components';
import { DEV_ASSERT } from '../utils';
import type { World } from '../world';

/**
 * A component that can be used to get the id, index, and generation of an Entity.
 * All living entities have the `Entity` component.
 */
export class Entity {
	#world: World;
	#destination: bigint;
	#added: object[];

	#id: number;
	#table: number;
	#row: number;

	constructor(world: World, id: number) {
		this.#world = world;
		this.#destination = 1n;
		this.#added = [];

		this.#id = id;
		this.#table = 0;
		this.#row = 0;
	}

	/**
	 * The entity's world-unique integer id.
	 */
	get id(): number {
		return this.#id;
	}

	/**
	 * Returns a boolean indicating if this entity is still alive or has been despawned.
	 * Entities that have a despawn command enqueued are still alive until commands are applied.
	 */
	get isAlive(): boolean {
		return this.#table !== 0;
	}

	/**
	 * Determines if this entity is the same as another entity.
	 * @param other The entity to compare against.
	 * @returns A boolean indicating if this entity refers to the provided entity.
	 */
	is(other: Readonly<Entity>): boolean {
		return this.id === other.id;
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param component The component instance to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	add<T extends object>(component: T extends Function ? never : T): this {
		const type = component.constructor as Class;
		DEV_ASSERT(
			type !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);
		DEV_ASSERT(
			isSizedComponent(type),
			'ZSTs must be added with EntityCommands.addType().',
		);
		this.#added.push(component);
		this.#destination |= 1n << BigInt(this.#world.getComponentId(type));
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param type The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(type: TagComponentType): this {
		DEV_ASSERT(
			isTagComponent(type),
			'Sized types must be added with EntityCommands.add()',
		);
		this.#destination |= 1n << BigInt(this.#world.getComponentId(type));
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param type The type of the component to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(type: Class): this {
		DEV_ASSERT(
			type !== Entity,
			'Tried to remove Entity component, which is forbidden.',
		);
		this.#destination &= ~(1n << BigInt(this.#world.getComponentId(type)));
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#destination = 0n;
	}

	/**
	 * Moves the entity to its target table, updating queries.
	 */
	move() {
		const world = this.#world;
		const currentTable = world.tables[this.#table];
		const targetTable = world.getTable(this.#destination);
		const backfilledEntity =
			currentTable.move(this.#row, targetTable, this.#added) ?? this;
		backfilledEntity.#row = this.#row;
		this.#row = targetTable.length - 1;
		this.#table = targetTable.id;
	}
}
