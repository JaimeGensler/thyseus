import { Memory } from '../utils';
import type { u32, u64 } from '../struct';

/**
 * A component that can be used to get the id, index, and generation of an Entity.
 * All living entities have the `Entity` component.
 *
 * Should always be accessed readonly.
 */
export class Entity {
	// Despite Entity consisting of two u32s, we set the alignment to 8 so that
	// Entity is still guaranteed to be component id 0 even after alignment sort
	static readonly alignment = 8;
	static readonly size = 8;

	private __$$b: number = 0;
	#index: u32 = 0;
	#generation: u32 = 0;

	deserialize() {
		this.#index = Memory.u32![this.__$$b >> 2];
		this.#generation = Memory.u32![(this.__$$b + 4) >> 2];
	}

	// This is a no-op because Entity is immutable.
	serialize() {}

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
	 * The entity's world-unique integer id (u64).
	 * Composed of an entity's generation & index.
	 */
	get id(): u64 {
		return (BigInt(this.#generation) << 32n) | BigInt(this.#index);
	}

	/**
	 * The index of this entity (u32).
	 */
	get index(): u32 {
		return this.#index;
	}

	/**
	 * The generation of this entity (u32).
	 */
	get generation(): u32 {
		return this.#generation;
	}
}
