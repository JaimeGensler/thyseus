import { DEV_ASSERT, Memory } from '../utils';
import { Entity } from './Entity';
import { Vec } from './Vec';
import type { World } from '../world';
import type { Struct } from '../struct';

const low32 = 0x0000_0000_ffff_ffffn;
const getIndex = (entityId: bigint) => Number(entityId & low32);
const getGeneration = (entityId: bigint) => Number(entityId >> 32n);
const ENTITY_BATCH_SIZE = 256;
const createSharedVec = (world: World) =>
	Vec.fromPointer(world.threads.queue(() => Memory.alloc(Vec.size)));

const ENTITIES_POINTER_SIZE = 8; // [u32, u32]

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
		this.#data = world.threads.queue(
			() => Memory.alloc(ENTITIES_POINTER_SIZE) >> 2,
		);
		this.#generations = createSharedVec(world);
		this.#locations = createSharedVec(world);
		this.#freed = createSharedVec(world);
	}

	/**
	 * A **lockfree** method to obtain a new Entity ID.
	 */
	getId(): bigint {
		const cursor = this.#moveCursor();
		if (cursor >= this.#freed.length) {
			// If we've already exhausted freed ids,
			// bump the nextId and return that (generation = 0)
			return BigInt(Atomics.add(Memory.views.u32, this.#data, 1));
		}
		const index = this.#freed.get(this.#freed.length - 1 - cursor);
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
	freeId(entityId: bigint): void {
		const index = getIndex(entityId);
		const newGeneration = this.#generations.get(index) + 1;
		this.#generations.set(index, newGeneration);
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
	 * Checks if the provided entity id was despawned.
	 * @param entityId The id of the entity to check.
	 * @returns A `boolean`, true if the entity is alive and false if it is not.
	 */
	wasDespawned(entityId: bigint): boolean {
		const index = getIndex(entityId);
		return (
			this.#generations.length > index &&
			this.#generations.get(index) !== getGeneration(entityId)
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
		const { u32 } = Memory.views;
		this.#freed.length -= Math.min(this.#freed.length, u32[this.#data + 1]);
		u32[this.#data + 1] = 0;

		const entityCount = u32[this.#data];
		if (entityCount >= this.#generations.length) {
			const newLength =
				Math.ceil((entityCount + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			// Set the length rather than call grow because we want these
			// elements to be initialized.
			this.#generations.length = newLength;
			this.#locations.length = newLength * 2;
		}
	}

	getTableId(entityId: bigint): number {
		return this.#locations.get(getIndex(entityId) << 1);
	}
	setTableId(entityId: bigint, tableIndex: number): void {
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
		return this.#world.tables[this.getTableId(entityId)]?.archetype ?? 0n;
	}

	/**
	 * Atomically moves the cursor by one.
	 * @returns
	 */
	#moveCursor() {
		// This will move the cursor past the length of the freed Vec - this is
		// intentional, we check to see if we've moved too far to see if we need
		// to get fresh (generation = 0) ids.
		return Atomics.add(Memory.views.u32, this.#data + 1, 1);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;
	const { World } = await import('../world');

	const ONE_GENERATION = 1n << 32n;
	async function createWorld(...components: Struct[]) {
		const builder = World.new({ isMainThread: true });
		for (const comp of components) {
			builder.registerComponent(comp);
		}
		return builder.build();
	}

	beforeEach(() => Memory.UNSAFE_CLEAR_ALL());

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
