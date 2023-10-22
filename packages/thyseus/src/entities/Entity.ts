/**
 * A component that can be used to get the id, index, and generation of an Entity.
 * All living entities have the `Entity` component.
 */
export class Entity {
	#index: number = 0;
	#generation: number = 0;

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
	get id(): bigint {
		return (BigInt(this.#generation) << 32n) | BigInt(this.#index);
	}

	/**
	 * The `u32` index of this entity.
	 */
	get index(): number {
		return this.#index;
	}

	/**
	 * The `u32` generation of this entity.
	 */
	get generation(): number {
		return this.#generation;
	}
}
