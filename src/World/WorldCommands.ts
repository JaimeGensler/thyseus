import type Entities from './Entities';
import { ComponentType, Entity } from '../Components';

export default class WorldCommands {
	queue = new Map<bigint, bigint>(); // Map<eid, tableid>

	#entities: Entities;
	#entity: Entity;
	#store: BigUint64Array;
	#components: Set<ComponentType>;
	constructor(entities: Entities, components: Set<ComponentType>) {
		this.#entities = entities;
		this.#store = new BigUint64Array(1);
		this.#entity = new Entity([this.#store], 0, this);
		this.#components = components;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	spawn(): Entity {
		this.#store[0] = this.#entities.spawn();
		return this.#entity;
	}

	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): this {
		this.queue.set(id, 0n);
		return this;
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	get(id: bigint): Entity {
		this.#store[0] = id;
		return this.#entity;
	}

	insertInto(id: bigint, Component: ComponentType) {
		this.queue.set(
			id,
			(this.queue.get(id) ?? this.#entities.getTableId(id)) &
				(1n << BigInt(getSetIndex(this.#components, Component))),
		);
	}
	removeFrom(id: bigint, Component: ComponentType) {
		this.queue.set(
			id,
			(this.queue.get(id) ?? this.#entities.getTableId(id)) ^
				(1n << BigInt(getSetIndex(this.#components, Component))),
		);
	}
}

const getSetIndex = <T>(set: Set<T>, key: T) => [...set].indexOf(key);
