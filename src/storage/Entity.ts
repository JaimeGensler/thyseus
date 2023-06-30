import { Memory } from '../utils';

export class Entity {
	static size = 8;
	static alignment = 8;

	private declare __$$b: number;

	#id: bigint = 0n;
	#index: number = 0;
	#generation: number = 0;

	deserialize() {
		this.#id = Memory.u64[this.__$$b >> 3];
		this.#index = Memory.u32![this.__$$b >> 2];
		this.#generation = Memory.u32![(this.__$$b + 4) >> 2];
	}
	serialize() {
		// This is a no-op because Entity is immutable.
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return this.#id;
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return this.#index;
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return this.#generation;
	}
}
