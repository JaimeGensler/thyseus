import type { World } from '../world';
import type { Class } from '../components';

import { Entity } from './Entity';

export class Entities {
	/**
	 * The world this `Entities` instance belongs to.
	 */
	#world: World;

	/**
	 * The next entity index.
	 */
	#nextIndex: number;

	#cursor: number;

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
		this.#nextIndex = 0;
		this.#cursor = 0;
		this.locations = entityLocations;
		this.#freed = world.tables[0].getColumn(Entity);
		this.#location = [0, 0];
	}
	resetCursor() {
		this.#cursor = this.#freed.length;
	}

	get(): Entity {
		if (this.#cursor === 0) {
			this.locations.push(0, this.#freed.length);
			const ent = new Entity(this.#nextIndex++, 0);
			this.#freed.push(ent);
			return ent;
		}
		const free = this.#freed[--this.#cursor];
		const ent = new Entity(free.index, free.generation + 1);
		this.#freed[this.#cursor] = ent;
		return ent;
	}

	/**
	 * Gets the archetype (`bigint`) for the provided entity.
	 * @param entityId The id of the entity.
	 * @returns `bigint`, the archetype of the entity.
	 */
	getArchetype({ index }: Entity): bigint {
		return this.#world.tables[this.locations[index * 2]]?.archetype ?? 0n;
	}

	/**
	 * Gets the location (`[tableId: number, row: number]`) for a given entity.
	 * This assumes the entity is living.
	 * @param entity The Entity to check the location of.
	 * @returns The location of the Entity.
	 */
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

	const createWorld = async (...components: Class[]) => {
		const world = await World.new().build();
		world.components.push(...components);
		return world;
	};

	it('returns incrementing integers', async () => {
		const world = await createWorld();
		const { entities } = world;

		for (let i = 0; i < 256; i++) {
			expect(entities.get().index).toBe(i);
		}
	});

	it('returns entities with incremented generations', async () => {
		const world = await createWorld();
		const entities = world.entities;

		const e1 = entities.get();
		const e2 = entities.get();
		expect(e1.index).toBe(0);
		expect(e1.generation).toBe(0);
		expect(e2.index).toBe(1);
		expect(e2.generation).toBe(0);

		entities.resetCursor();
		const e2_recycled = entities.get();
		const e1_recycled = entities.get();
		const e3 = entities.get();
		const e4 = entities.get();

		expect(e2_recycled.index).toBe(1);
		expect(e2_recycled.generation).toBe(1);
		expect(e2_recycled).not.toBe(e2);
		expect(e1_recycled.index).toBe(0);
		expect(e1_recycled.generation).toBe(1);
		expect(e1_recycled).not.toBe(e2);
		expect(e3.index).toBe(2);
		expect(e3.generation).toBe(0);
		expect(e4.index).toBe(3);
		expect(e4.generation).toBe(0);

		entities.resetCursor();

		entities.get(); // 4
		entities.get(); // 3
		const e2_recycled2 = entities.get();
		const e1_recycled2 = entities.get();
		expect(e2_recycled2.index).toBe(1);
		expect(e2_recycled2.generation).toBe(2);
		expect(e1_recycled2.index).toBe(0);
		expect(e1_recycled2.generation).toBe(2);
	});
}
