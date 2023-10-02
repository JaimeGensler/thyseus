import type { u32, u64 } from '../struct';
import type { Store } from '../storage/Store';

/**
 * A component that can be used to get the id, index, and generation of an Entity.
 * All living entities have the `Entity` component.
 *
 * Should always be accessed readonly.
 */
export class Entity {
	// TODO: Remove u64 access of id and lower alignment to 4.
	static readonly alignment = 8;
	static readonly size = 8;
	#index: u32 = 0;
	#generation: u32 = 0;

	deserialize(store: Store) {
		this.#index = store.readU32();
		this.#generation = store.readU32();
	}
	serialize(store: Store) {
		store.writeU32(this.#index);
		store.writeU32(this.#generation);
	}

	constructor();
	constructor(id: bigint);
	constructor(index: number, generation: number);
	constructor(indexOrId: number | bigint = 0, generation: number = 0) {
		if (typeof indexOrId === 'number') {
			this.#index = indexOrId;
			this.#generation = generation!;
		} else {
			this.#index = Number(indexOrId & 0xffff_ffffn);
			this.#generation = Number(indexOrId >> 32n);
		}
	}

	/**
	 * Determines if this entity is the same as another entity.
	 * @param other The entity to compare against.
	 * @returns A boolean indicating if this entity refers to the provided entity.
	 */
	is(other: Readonly<Entity>): boolean {
		return (
			this.index === other.index && this.generation === other.generation
		);
	}

	/**
	 * The entity's world-unique `u64` integer id, composed of its generation and index.
	 */
	get id(): u64 {
		return (BigInt(this.#generation) << 32n) | BigInt(this.#index);
	}

	/**
	 * The `u32` index of this entity.
	 */
	get index(): u32 {
		return this.#index;
	}

	/**
	 * The `u32` generation of this entity.
	 */
	get generation(): u32 {
		return this.#generation;
	}
}
