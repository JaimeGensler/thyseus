import { DEV_ASSERT } from '../utils';
import { Entity } from './Entity';
import { Store } from '../storage/Store';
import { EntityLocation } from './EntityLocation';
import type { World } from '../world';
import type { Struct } from '../struct';

const low32 = 0x0000_0000_ffff_ffffn;
const getIndex = (entityId: bigint) => Number(entityId & low32);
const getGeneration = (entityId: bigint) => Number(entityId >> 32n);
const ENTITY_BATCH_SIZE = 256;

export class Entities {
	/**
	 * The world this `Entities` instance belongs to.
	 */
	#world: World;

	/**
	 * A store containing `[nextId: u32, cursor: u32, freeCount: u32]`.
	 */
	#data: Store;
	/**
	 * Generations (`u32`) of all spawned entities.
	 */
	#generations: Store;
	/**
	 * Locations (`EntityLocation`) of all spawned entities [table, row]
	 */
	#locations: Store;
	/**
	 * List of freed entity indexes (`u32`) available for reuse.
	 */
	#freed: Store;
	/**
	 * A reuseable `EntityLocation` to track where an entity lives.
	 */
	#location: EntityLocation;
	constructor(world: World) {
		this.#world = world;
		this.#location = new EntityLocation();
		this.#data = new Store(12);
		this.#generations = new Store(ENTITY_BATCH_SIZE * 4);
		this.#locations = new Store(ENTITY_BATCH_SIZE * EntityLocation.size);
		this.#freed = new Store(64 * 4);
	}

	/**
	 * A **lockfree** method to obtain a new Entity ID.
	 */
	getId(): bigint {
		const cursor = Atomics.add(this.#data.u32, 1, 1);
		const freeCount = this.#data.u32[2];
		if (cursor >= freeCount) {
			// If we've already exhausted freed ids,
			// bump the nextId and return that (generation = 0)
			return BigInt(Atomics.add(this.#data.u32, 0, 1));
		}
		const index = this.#freed.u32[freeCount - 1 - cursor];
		const generation = this.#generations.u32[index];
		return (BigInt(generation) << 32n) | BigInt(index);
	}

	/**
	 * Adds the provided entityId to the list of recycled Entity IDs,
	 * increments its generation, and moves its location.
	 *
	 * **NOTE: Is _not_ lock-free!**
	 * @param entityId The id of the entity to despawn.
	 */
	freeId(entityId: bigint): void {
		const index = getIndex(entityId);
		this.#generations.u32[index]++;
		this.#freed.u32[this.#data.u32[2]] = index;
		this.#data.u32[2]++;
		this.setLocation(entityId, this.#location.set(0, 0));
	}

	/**
	 * Checks if this entity is currently alive.
	 * Entities that have been queued for despawn are still alive until commands are processed.
	 * @param entityId The id of the entity to check.
	 * @returns A `boolean`, true if the entity is alive and false if it is not.
	 */
	isAlive(entityId: bigint): boolean {
		// If generations mismatch, it was despawned.
		return (
			getGeneration(entityId) ===
			this.#generations.u32[getIndex(entityId)]
		);
	}
	/**
	 * Checks if the entity with the provided id has been despawned.
	 * @param entityId
	 */
	wasDespawned(entityId: bigint): boolean {
		const index = getIndex(entityId);
		return (
			this.#generations.length > index &&
			this.#generations.u32[index] !== getGeneration(entityId)
		);
	}

	/**
	 * Verifies if an entity has a specific component type.
	 * @param entityId The id of the entity
	 * @param componentType The type (class) of the component to detect.
	 * @returns A `boolean`, true if the entity has the component and false if it does not.
	 */
	hasComponent(entityId: bigint, componentType: Struct): boolean {
		const componentId = this.#world.components.indexOf(componentType);
		DEV_ASSERT(
			componentId !== -1,
			'hasComponent method must receive a component that exists in the world.',
		);
		const archetype = this.getArchetype(entityId);
		const componentBit = 1n << BigInt(componentId);
		return (archetype & componentBit) === componentBit;
	}

	resetCursor(): void {
		this.#data.u32[1] = 0;
		const entityCount = this.#data.u32[0];
		if (entityCount >= this.#generations.u32.length) {
			const newLength =
				Math.ceil((entityCount + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			this.#generations.resize(newLength * 4);
			this.#locations.resize(newLength * EntityLocation.size);
		}
	}

	getLocation(entityId: bigint): EntityLocation {
		this.#locations.offset = getIndex(entityId) * EntityLocation.size;
		this.#location.deserialize(this.#locations);
		return this.#location;
	}
	setLocation(entityId: bigint, location: EntityLocation): void {
		this.#locations.offset = getIndex(entityId) * EntityLocation.size;
		location.serialize(this.#locations);
	}

	/**
	 * Gets the archetype (`bigint`) for the provided entity.
	 * @param entityId The id of the entity.
	 * @returns `bigint`, the archetype of the entity.
	 */
	getArchetype(entityId: bigint): bigint {
		const { tableId } = this.getLocation(entityId);
		return this.#world.tables[tableId]?.archetype ?? 0n;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	const ONE_GENERATION = 1n << 32n;
	async function createWorld(...components: Struct[]) {
		const builder = World.new();
		for (const comp of components) {
			builder.registerComponent(comp);
		}
		return builder.build();
	}

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

		entities.resetCursor();
		entities.freeId(0n);
		entities.freeId(1n);

		expect(entities.getId()).toBe(ONE_GENERATION | 1n);
		expect(entities.getId()).toBe(ONE_GENERATION | 0n);
		expect(entities.getId()).toBe(2n);
		expect(entities.getId()).toBe(3n);

		entities.resetCursor();
		entities.freeId(ONE_GENERATION | 1n);
		entities.freeId(2n);

		expect(entities.getId()).toBe(ONE_GENERATION | 2n);
		expect(entities.getId()).toBe((ONE_GENERATION * 2n) | 1n);
	});

	it('hasComponent returns true if the entity has the component and false otherwise', async () => {
		class A {
			static size = 0;
		}
		class B {
			static size = 0;
		}
		const world = await createWorld(A, B);
		const { entities } = world;

		const none = entities.getId();
		const a = entities.getId();
		const b = entities.getId();
		const ab = entities.getId();
		entities.resetCursor();

		world.moveEntity(none, 0b001n);
		world.moveEntity(a, 0b011n);
		world.moveEntity(b, 0b101n);
		world.moveEntity(ab, 0b111n);

		expect(entities.hasComponent(none, Entity)).toBe(true);
		expect(entities.hasComponent(none, A)).toBe(false);
		expect(entities.hasComponent(none, B)).toBe(false);

		expect(entities.hasComponent(a, Entity)).toBe(true);
		expect(entities.hasComponent(a, A)).toBe(true);
		expect(entities.hasComponent(a, B)).toBe(false);

		expect(entities.hasComponent(b, Entity)).toBe(true);
		expect(entities.hasComponent(b, A)).toBe(false);
		expect(entities.hasComponent(b, B)).toBe(true);

		expect(entities.hasComponent(ab, Entity)).toBe(true);
		expect(entities.hasComponent(ab, A)).toBe(true);
		expect(entities.hasComponent(ab, B)).toBe(true);
	});
}
