import type { Commands } from './Commands';
import type { Struct, StructInstance } from '../struct';
import type { World } from '../world';
import { DEV_ASSERT } from '../utils';
import { Entity } from '../storage';
import {
	AddComponentCommand,
	AddComponentTypeCommand,
	RemoveComponentTypeCommand,
} from './commandTypes';

type NotFunction<T> = T extends Function ? never : T;

export const addComponent = new AddComponentCommand();
export const addComponentType = new AddComponentTypeCommand();
export const removeComponentType = new RemoveComponentTypeCommand();
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
		const componentType: Struct = component.constructor as any;
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);
		if (!this.#isAlive) {
			return this;
		}
		addComponent.entityId = this.id;
		addComponent.componentId = this.#world.getComponentId(componentType);
		addComponent.component = component as StructInstance;
		this.#commands.push(addComponent, componentType.size!);
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Struct): this {
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);
		addComponentType.entityId = this.id;
		addComponentType.componentId =
			this.#world.getComponentId(componentType);
		this.#commands.push(addComponentType);
		return this;
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
		removeComponentType.entityId = this.id;
		removeComponentType.componentId =
			this.#world.getComponentId(componentType);
		this.#commands.push(removeComponentType);
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
