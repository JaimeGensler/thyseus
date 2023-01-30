import { initStruct } from './initStruct';
import type { Struct } from '../struct';
import type { Commands } from '../world/Commands';
import type { MemoryViews } from '../utils/memory';

type NotFunction<T> = T extends Function ? never : T;

export class Entity {
	static size = 8;
	static alignment = 8;

	private declare __$$s: MemoryViews;
	private declare __$$b: number;

	#commands: Commands;
	constructor(commands?: Commands, id?: bigint) {
		initStruct(this);
		this.#commands = commands!;
		if (id !== undefined) {
			this.__$$s.u64![0] = id;
		}
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return this.__$$s.u64![this.__$$b >> 3];
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return this.__$$s.u32![this.__$$b >> 2];
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return this.__$$s.u32![(this.__$$b >> 2) + 1];
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param component The component instance to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	add<T extends object>(component: NotFunction<T>): this {
		this.#commands.insertInto(this.id, component);
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Struct): this {
		this.#commands.insertTypeInto(this.id, componentType);
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: Struct): this {
		this.#commands.removeFrom(this.id, Component);
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#commands.despawn(this.id);
	}
}
