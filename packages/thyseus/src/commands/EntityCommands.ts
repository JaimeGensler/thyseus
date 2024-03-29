import { Entity } from '../entities';
import { DEV_ASSERT } from '../utils';
import {
	isSizedComponent,
	isTagComponent,
	type Class,
	type TagComponentType,
} from '../components';

import { EntityCommandQueue } from './EntityCommandQueue';

type NotFunction<T> = T extends Function ? never : T;

/**
 * A collection of methods that enqueue commands to alter the components an `Entity` possesses.
 */
export class EntityCommands {
	#queue: EntityCommandQueue;
	entity: Readonly<Entity>;

	constructor(queue: EntityCommandQueue, entity: Readonly<Entity>) {
		this.#queue = queue;
		this.entity = entity;
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param component The component instance to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	add<T extends object>(component: NotFunction<T>): this {
		const componentType = component.constructor as Class;
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);
		DEV_ASSERT(
			isSizedComponent(componentType),
			'ZSTs must be added with EntityCommands.addType().',
		);
		if (this.entity.isAlive) {
			this.#queue.add(this.entity, component);
		}
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
		this.#queue.addType(this.entity, type);
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
		if (this.entity.isAlive) {
			this.#queue.remove(this.entity, type);
		}
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#queue.despawn(this.entity);
	}
}
