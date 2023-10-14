import type { Commands } from './Commands';
import type { Struct, StructInstance } from '../components';
import type { World } from '../world';
import { DEV_ASSERT } from '../utils';
import { Entity } from '../entities';
import {
	AddComponentCommand,
	RemoveComponentCommand,
} from './ComponentCommands';

type NotFunction<T> = T extends Function ? never : T;

export class EntityCommands {
	#world: World;
	#commands: Commands;
	#id: bigint;
	#isAlive: boolean;
	#reused: Map<Struct, StructInstance>;
	constructor(world: World, commands: Commands, id: bigint) {
		this.#world = world;
		this.#commands = commands;
		this.#id = id;
		this.#isAlive = !this.#world.entities.wasDespawned(this.id);
		this.#reused = new Map();
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
		const componentType: Struct = component.constructor as any;
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);
		if (!this.#isAlive) {
			return this;
		}
		this.#commands.push(
			AddComponentCommand.with(
				this.id,
				this.#world.getComponentId(componentType),
				component as StructInstance,
			),
			componentType.size!,
		);
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Struct): this {
		if (componentType.boxedSize! === 0) {
			if (!this.#reused.has(componentType)) {
				this.#reused.set(componentType, new componentType());
			}
			return this.add(this.#reused.get(componentType)!);
		}
		// Structs with boxed types can't be recycled as we would end up
		// assigning the same object to multiple structs.
		return this.add(new componentType());
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(componentType: Struct): this {
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to remove Entity component, which is forbidden.',
		);
		if (!this.#isAlive) {
			return this;
		}
		this.#commands.push(
			RemoveComponentCommand.with(
				this.id,
				this.#world.getComponentId(componentType),
			),
		);
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
