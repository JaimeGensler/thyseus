import type { Commands } from './Commands';
import type { Struct } from '../struct';
import type { World } from '../world';
import { DEV_ASSERT, Memory } from '../utils';
import { Entity } from '../storage';
import { AddComponentCommand, RemoveComponentCommand } from './commandTypes';

type NotFunction<T> = T extends Function ? never : T;

export class EntityCommands {
	#world: World;
	#commands: Commands;
	#initialValuePointers: number[];
	#id: bigint;
	#isAlive: boolean;
	constructor(
		world: World,
		commands: Commands,
		initialValuePointers: number[],
		id: bigint,
	) {
		this.#world = world;
		this.#commands = commands;
		this.#initialValuePointers = initialValuePointers;
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

		const command = this.#commands.push(
			AddComponentCommand,
			(component.constructor as Struct).size!,
		);
		command.entityId = this.id;
		command.componentId = this.#world.getComponentId(componentType);
		command.serialize();
		if (componentType.size === 0) {
			return this;
		}
		const previousPointer = (component as any).__$$b;
		(component as any).__$$b = command.dataStart;
		(component as any).serialize();
		(component as any).__$$b = previousPointer;
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
		if (!this.#isAlive) {
			return this;
		}
		const command = this.#commands.push(
			AddComponentCommand,
			componentType.size!,
		);
		command.entityId = this.id;
		command.componentId = this.#world.getComponentId(componentType);
		command.serialize();
		if (componentType.size === 0) {
			return this;
		}
		Memory.copy(
			this.#initialValuePointers[command.componentId],
			componentType.size!,
			command.dataStart,
		);
		componentType.copy?.(
			this.#initialValuePointers[command.componentId],
			command.dataStart,
		);
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
		const command = this.#commands.push(RemoveComponentCommand);
		command.entityId = this.id;
		command.componentId = this.#world.getComponentId(componentType);
		command.serialize();
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
