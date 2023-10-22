import { Entity } from '../entities';
import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

import {
	AddComponentCommand,
	RemoveComponentCommand,
} from './ComponentCommands';
import type { Commands } from './Commands';

type NotFunction<T> = T extends Function ? never : T;

export class EntityCommands {
	#world: World;
	#commands: Commands;
	#id: bigint;
	#isAlive: boolean;
	constructor(world: World, commands: Commands, id: bigint) {
		this.#world = world;
		this.#commands = commands;
		this.#id = id;
		this.#isAlive = !this.#world.entities.wasDespawned(this.id);
	}

	get id() {
		return this.#id;
	}
	setId(newId: bigint): this {
		this.#id = newId;
		this.#isAlive = !this.#world.entities.wasDespawned(this.id);
		return this;
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
		if (!this.#isAlive) {
			return this;
		}
		this.#commands.push(new AddComponentCommand(this.id, component));
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Class): this {
		return this.add(new componentType());
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(componentType: Class): this {
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to remove Entity component, which is forbidden.',
		);
		if (!this.#isAlive) {
			return this;
		}
		this.#commands.push(new RemoveComponentCommand(this.id, componentType));
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#commands.despawnById(this.id);
	}
}
