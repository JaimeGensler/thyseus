import { Entity, type Entities } from '../storage';
import type { Struct } from '../struct';
import type { World } from './World';

export class Commands {
	static fromWorld(world: World) {
		return new this(world, world.entities, world.components);
	}
	queue = new Map<bigint, bigint>(); // Map<eid, tableid>

	#world: World;
	#entities: Entities;
	#entity: Entity;
	#store: BigUint64Array;
	#components: Struct[];
	constructor(world: World, entities: Entities, components: Struct[]) {
		this.#world = world;
		this.#entities = entities;
		this.#entity = new Entity();
		//@ts-ignore
		this.#store = this.#entity.__$$s.u64;
		this.#components = components;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	spawn(): Entity {
		const id = this.#entities.spawn();
		this.#store[0] = id;
		this.insertInto(id, Entity);
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

	insertInto(entityId: bigint, Component: Struct) {
		this.queue.set(
			entityId,
			this.#getBitset(entityId) |
				(1n << BigInt(this.#components.indexOf(Component))),
		);
	}
	removeFrom(entityId: bigint, Component: Struct) {
		this.queue.set(
			entityId,
			this.#getBitset(entityId) ^
				(1n << BigInt(this.#components.indexOf(Component))),
		);
	}

	#getBitset(entityId: bigint) {
		return (
			this.queue.get(entityId) ??
			this.#world.archetypes[this.#entities.getTableIndex(entityId)]
				.bitfield
		);
	}
}
