/**
 * A component that can be used to get the id, index, and generation of an Entity.
 * All living entities have the `Entity` component.
 */
export class Entity {
	static despawn(entity: Entity) {
		entity.#isAlive = false;
	}

	#index: number;
	#generation: number;
	#isAlive: boolean;

	constructor(index: number, generation: number) {
		this.#isAlive = true;
		this.#index = index;
		this.#generation = generation;
	}

	/**
	 * The entity's world-unique `u64` integer id, composed of its generation and index.
	 */
	get id(): bigint {
		return (BigInt(this.#generation) << 32n) | BigInt(this.#index);
	}

	/**
	 * The index of this entity.
	 */
	get index(): number {
		return this.#index;
	}

	/**
	 * The generation of this entity.
	 */
	get generation(): number {
		return this.#generation;
	}

	/**
	 * Returns a boolean indicating if this entity is still alive or has been despawned.
	 *
	 * Entities that have a despawn command enqueued are still alive until commands are applied.
	 */
	get isAlive(): boolean {
		return this.#isAlive;
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
}
