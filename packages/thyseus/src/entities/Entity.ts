import {
	isSizedComponent,
	isTagComponent,
	type Class,
	type TagComponentType,
} from '../components';
import { DEV_ASSERT } from '../utils';

import type { Entities } from './Entities';

/**
 * A component that can be used to modify an entity.
 * All living entities have the `Entity` component.
 */
export class Entity {
	#entities: Entities;

	#id: number;
	#table: number = 0;
	#row: number = 0;

	constructor(entities: Entities, id: number) {
		this.#entities = entities;
		this.#id = id;
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
	 * Returns if an entity has the provided component or not.
	 * @param component The component to check presence for.
	 * @returns `true` if the entity has the component, false otherwise.
	 */
	has(component: Class): boolean {
		return this.#entities.hasComponent(this, component);
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
		this.#entities.add(this, component);
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
		this.#entities.addType(this, type);
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
		this.#entities.remove(this, type);
		return this;
	}
	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#entities.remove(this, Entity);
	}

	/**
	 * Sets the location of this entity to the provided table and row.
	 * Unsafe to use alone - use `Entities.p.update()` instead.
	 */
	move(table: number, row: number): void {
		this.#table = table;
		this.#row = row;
	}

	/**
	 * Provides the location of the entity.
	 * @returns The tableId and row of this entity.
	 */
	locate(): [tableId: number, row: number] {
		return [this.#table, this.#row];
	}
}
