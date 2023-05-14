import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { memory } from '../utils/memory';
import { Entity } from './Entity';
import { Vec } from './Vec';
import type { World } from '../world';
import type { Struct } from '../struct';

const low32 = 0x0000_0000_ffff_ffffn;
const high32 = 0xffff_ffff_0000_0000n;
const getIndex = (entityId: bigint) => Number(entityId & low32);
const getGeneration = (entityId: bigint) => Number((entityId & high32) >> 32n);
const ENTITY_BATCH_SIZE = 256;
const createSharedVec = (world: World) =>
	Vec.fromPointer(world.threads.queue(() => memory.alloc(Vec.size)));

export class Entities {
	/**
	 * The world this `Entities` instance belongs to.
	 */
	#world: World;
	/**
	 * Pointer to [nextId: u32, cursor: u32].
	 * **Already shifted for u32 access.**
	 */
	#data: number;
	/**
	 * Generations of all spawned entities.
	 *
	 * `entityGeneration = generations[entityIndex]`
	 */
	#generations: Vec;
	/**
	 * Locations of all spawned entities [table, row]
	 *
	 * `entityTable = locations[entityIndex * 2]`
	 * `entityRow = locations[(entityIndex * 2) + 1]`
	 */
	#locations: Vec;
	/**
	 * List of freed entity indexes for reuse
	 */
	#freed: Vec;
	constructor(world: World) {
		this.#world = world;
		this.#data = world.threads.queue(() => memory.alloc(8) >> 2);
		this.#generations = createSharedVec(world);
		this.#locations = createSharedVec(world);
		this.#freed = createSharedVec(world);
	}

	/**
	 * A **lockfree** method to obtain a new Entity ID.
	 */
	spawn(): bigint {
		const cursor = this.#moveCursor();
		if (cursor > this.#freed.length) {
			// If we've already exhausted freed ids,
			// bump the nextId and return that (generation = 0)
			return BigInt(Atomics.add(memory.views.u32, this.#data, 1));
		}
		const index = this.#freed.get(this.#freed.length - cursor);
		// generations[index] will exist because we've allocated
		// generation lookups for all freed entities.
		const generation = this.#generations.get(index);
		return (BigInt(generation) << 32n) | BigInt(index);
	}

	/**
	 * Adds the provided entityId to the list of recycled Entity IDs,
	 * increments its generation, and moves its location.
	 *
	 * **NOTE: Is _not_ lock-free!**
	 * @param entityId The id of the entity to despawn.
	 */
	despawn(entityId: bigint): void {
		const index = getIndex(entityId);
		this.#generations.set(index, this.#generations.get(index) + 1);
		this.#freed.push(getIndex(entityId));
		this.#locations.set(getIndex(entityId) << 1, 0);
	}

	/**
	 * Checks if this entity is currently alive
	 * @param entityId The id of the entity to check.
	 * @returns A `boolean`, true if the entity is alive and false if it is not.
	 */
	isAlive(entityId: bigint): boolean {
		// If generations mismatch, it was despawned.
		return (
			getGeneration(entityId) ===
			this.#generations.get(getIndex(entityId))
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
		const { u32 } = memory.views;
		const cursor = u32[this.#data + 1];
		for (let i = 0; i < cursor; i++) {}
		u32[this.#data + 1] = 0; // Reset cursor
		const entityCount = u32[this.#data];
		if (entityCount >= this.#generations.length) {
			const newLength =
				Math.ceil((entityCount + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			this.#generations.grow(newLength);
			this.#locations.grow(newLength * 2);
		}
	}

	getTableIndex(entityId: bigint): number {
		return this.#locations.get(getIndex(entityId) << 1);
	}
	setTableIndex(entityId: bigint, tableIndex: number): void {
		this.#locations.set(getIndex(entityId) << 1, tableIndex);
	}

	getRow(entityId: bigint): number {
		return this.#locations.get((getIndex(entityId) << 1) + 1);
	}
	setRow(entityId: bigint, row: number): void {
		this.#locations.set((getIndex(entityId) << 1) + 1, row);
	}

	/**
	 * Gets the archetype (`bigint`) for the provided entity.
	 * @param entityId The id of the entity.
	 * @returns `bigint`, the archetype of the entity.
	 */
	getArchetype(entityId: bigint): bigint {
		return (
			this.#world.tables[this.getTableIndex(entityId)]?.archetype ?? 0n
		);
	}

	/**
	 * Atomically moves the cursor by one.
	 * @returns
	 */
	#moveCursor() {
		// This will move the cursor past the length of the freed Vec - this is
		// intentional, we check to see if we've moved too far to see if we need
		// to get fresh (generation=0) ids.
		return Atomics.add(memory.views.u32, this.#data, 1) + 1;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { World } = await import('../world');

	async function createWorld(...components: Struct[]) {
		const builder = World.new({ isMainThread: true });
		for (const comp of components) {
			builder.registerComponent(comp);
		}
		return builder.build();
	}

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	it('returns incrementing generational integers', async () => {
		const world = await createWorld();
		const entities = world.entities;

		for (let i = 0n; i < 256n; i++) {
			expect(entities.spawn()).toBe(i);
		}
	});

	it('returns entities from the Recycled table with incremented generation', async () => {
		const world = await createWorld();
		const entities = world.entities;
		const recycledTable = world.tables[1];

		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(2n);

		recycledTable.length = 3;

		const ptr = recycledTable.getColumn(Entity);

		memory.views.u64[(ptr >> 3) + 0] = 0n;
		memory.views.u64[(ptr >> 3) + 1] = 1n;
		memory.views.u64[(ptr >> 3) + 2] = 2n;

		// expect(entities.spawn()).toBe(0n + ONE_GENERATION);
		// expect(entities.spawn()).toBe(1n + ONE_GENERATION);
		// expect(entities.spawn()).toBe(2n + ONE_GENERATION);
		expect(entities.spawn()).toBe(3n);
	});

	it('reset grows by at least as many entities have been spawned', async () => {
		const reallocSpy = vi.spyOn(memory, 'reallocAt');
		const world = await createWorld();
		const entities = world.entities;

		expect(reallocSpy).not.toHaveBeenCalled();
		for (let i = 0; i < ENTITY_BATCH_SIZE - 1; i++) {
			entities.spawn();
		}
		entities.resetCursor();
		expect(reallocSpy).not.toHaveBeenCalled();

		entities.spawn();
		entities.resetCursor();
		expect(reallocSpy).toHaveBeenCalledOnce();
		expect(reallocSpy).toHaveBeenCalledWith(152, 4096);

		reallocSpy.mockReset();

		for (let i = 0; i < ENTITY_BATCH_SIZE * 2; i++) {
			entities.spawn();
		}
		entities.resetCursor();
		expect(reallocSpy).toHaveBeenCalledOnce();
		expect(reallocSpy).toHaveBeenCalledWith(152, 8192);
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

		const none = entities.spawn();
		const a = entities.spawn();
		const b = entities.spawn();
		const ab = entities.spawn();
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
