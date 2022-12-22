import { Entity } from '../storage';
import type { Struct } from '../struct';
import type { Entities } from '../storage/Entities';
import type { World } from './World';

export class Commands {
	static fromWorld(world: World) {
		return new this(world.entities, world.components);
	}
	queue = new Map<bigint, bigint>(); // Map<eid, tableid>

	#entities: Entities;
	#entity: Entity;
	#store: BigUint64Array;
	#components: Struct[];
	constructor(entities: Entities, components: Struct[]) {
		this.#entities = entities;
		const buffer = new ArrayBuffer(8);
		this.#store = new BigUint64Array(1);
		this.#entity = new Entity(
			{ buffer, u8: new Uint8Array(buffer), u64: this.#store },
			0,
			this,
		);
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

	insertInto(id: bigint, Component: Struct) {
		this.queue.set(
			id,
			(this.queue.get(id) ?? this.#entities.getTableId(id)) |
				(1n << BigInt(this.#components.indexOf(Component))),
		);
	}
	removeFrom(id: bigint, Component: Struct) {
		this.queue.set(
			id,
			(this.queue.get(id) ?? this.#entities.getTableId(id)) ^
				(1n << BigInt(this.#components.indexOf(Component))),
		);
	}
}
