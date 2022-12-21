import { TYPE_IDS, type Struct, type StructStore } from '../struct';
import type { Commands } from '../World/Commands';

export class Entity {
	static schema = TYPE_IDS.u64 | TYPE_IDS.u32;
	static size = 8;

	private __$$s: StructStore;
	private __$$b: number;
	#index: number;

	#commands: Commands;
	constructor(store: StructStore, index: number, commands: Commands) {
		this.__$$s = store;
		this.#index = index;
		this.__$$b = index * Entity.size;
		this.#commands = commands;
	}

	private get __$$i() {
		return this.#index;
	}
	private set __$$i(val: number) {
		this.#index = val;
		this.__$$b = val * Entity.size;
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
	 * @param Component The Component **class** to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	insert(Component: Struct): this {
		this.#commands.insertInto(this.id, Component);
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
