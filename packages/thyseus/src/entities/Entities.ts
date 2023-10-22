import type { World } from '../world';
import type { Class } from '../components';

import { Entity } from './Entity';

export class Entities {
	/**
	 * The world this `Entities` instance belongs to.
	 */
	#world: World;

	/**
	 * The next entity ID.
	 */
	#nextId: number;
	/**
	 * Locations (`[table, row]`) of all spawned entities.
	 */
	locations: number[];
	/**
	 * List of freed entities available for reuse.
	 */
	#freed: Entity[];

	#location: [tableId: number, row: number];

	constructor(world: World, entityLocations: number[]) {
		this.#world = world;
		this.#nextId = 0;
		this.locations = entityLocations;
		this.#freed = world.tables[0].getColumn(Entity);
		this.#location = [0, 0];
	}

	get(): Entity {
		const free = this.#freed.pop();
		return free
			? new Entity(free.index, free.generation + 1)
			: new Entity(this.#nextId++, 0);
	}

	/**
	 * Checks if this entity is currently alive.
	 * Entities that have been queued for despawn are still alive until commands are processed.
	 * @param entityId The id of the entity to check.
	 * @returns A `boolean`, true if the entity is alive and false if it is not.
	 */
	isAlive(entityId: bigint): boolean {
		return true;
		// If generations mismatch, it was despawned.
		// return (
		// 	getGeneration(entityId) === this.#generations[getIndex(entityId)]
		// );
	}
	/**
	 * Checks if the entity with the provided id has been despawned.
	 * @param entityId
	 */
	wasDespawned(entityId: bigint): boolean {
		return false;
		// const index = getIndex(entityId);
		// return (
		// 	this.#generations.length > index &&
		// 	this.#generations[index] !== getGeneration(entityId)
		// );
	}

	/**
	 * Gets the archetype (`bigint`) for the provided entity.
	 * @param entityId The id of the entity.
	 * @returns `bigint`, the archetype of the entity.
	 */
	getArchetype(entity: Entity): bigint {
		const [tableId] = this.getLocation(entity);
		return this.#world.tables[tableId]?.archetype ?? 0n;
	}

	getLocation({ index }: Entity): [tableId: number, row: number] {
		this.#location[0] = this.locations[index * 2];
		this.#location[1] = this.locations[index * 2 + 1];
		return this.#location;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	const ONE_GENERATION = 1n << 32n;
	const createWorld = async (...components: Class[]) => {
		const world = await World.new().build();
		world.components.push(...components);
		return world;
	};

	it('returns incrementing generational integers', async () => {
		const world = await createWorld();
		const { entities } = world;

		for (let i = 0n; i < 256n; i++) {
			expect(entities.getId()).toBe(i);
		}
	});

	it('returns entities with incremented generations', async () => {
		const world = await createWorld();
		const entities = world.entities;

		expect(entities.getId()).toBe(0n);
		expect(entities.getId()).toBe(1n);

		entities.freeId(0n);
		entities.freeId(1n);

		expect(entities.getId()).toBe(ONE_GENERATION | 1n);
		expect(entities.getId()).toBe(ONE_GENERATION | 0n);
		expect(entities.getId()).toBe(2n);
		expect(entities.getId()).toBe(3n);

		entities.freeId(ONE_GENERATION | 1n);
		entities.freeId(2n);

		expect(entities.getId()).toBe(ONE_GENERATION | 2n);
		expect(entities.getId()).toBe((ONE_GENERATION * 2n) | 1n);
	});
}
