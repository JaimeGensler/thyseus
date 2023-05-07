import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { memory } from '../utils/memory';
import { Entity } from './Entity';
import type { Table } from './Table';
import type { World } from '../world';
import type { Struct } from '../struct';

const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;
const getIndex = (entityId: bigint) => Number(entityId & lo32);
const ENTITY_BATCH_SIZE = 256;
const ONE_GENERATION = 1n << 32n;

export class Entities {
	static fromWorld(world: World): Entities {
		return new this(
			world,
			world.threads.queue(() => {
				const { u32 } = memory.views;
				const pointer = memory.alloc(4 * 4) >> 2;
				u32[pointer + 2] = memory.alloc(8 * ENTITY_BATCH_SIZE);
				u32[pointer + 3] = ENTITY_BATCH_SIZE;
				return pointer;
			}),
		);
	}

	#world: World;
	#pointer: number; // [nextId, cursor, locationsPointer, capacity]
	#recycled: Table;
	constructor(world: World, pointer: number) {
		this.#pointer = pointer;
		this.#world = world;
		this.#recycled = world.archetypes[1];
	}

	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint {
		const { u32, u64 } = memory.views;
		const recycledSize = this.#recycled.length;
		const recycledPtr = this.#recycled.getColumn(Entity);
		for (
			let currentCursor = this.#getCursor();
			currentCursor < recycledSize;
			currentCursor = this.#getCursor()
		) {
			if (this.#tryCursorMove(currentCursor)) {
				return u64[(recycledPtr >> 3) + currentCursor] + ONE_GENERATION;
			}
		}
		return BigInt(Atomics.add(u32, this.#pointer, 1));
	}

	/**
	 * Checks if an entity is currently alive or not.
	 * @param entityId The entity id to check
	 * @returns `true` if alive, `false` if not.
	 */
	isAlive(entityId: bigint): boolean {
		const { u32, u64 } = memory.views;
		const tableIndex = this.getTableIndex(entityId);
		const row = this.getRow(entityId);
		const ptr = this.#world.archetypes[tableIndex].getColumn(Entity);
		return (
			getIndex(entityId) < Atomics.load(u32, this.#pointer) &&
			(tableIndex === 0 ||
				tableIndex !== 1 ||
				u64[(ptr >> 3) + row] === entityId)
		);
	}

	/**
	 * Verifies if an entity has a specific component type.
	 * @param entityId The id of the entity
	 * @param componentType The type (class) of the component to detect.
	 * @returns `boolean`, true if the entity has the component and false if it does not.
	 */
	hasComponent(entityId: bigint, componentType: Struct): boolean {
		const componentId = this.#world.components.indexOf(componentType);
		DEV_ASSERT(
			componentId !== -1,
			'hasComponent method must receive a component that exists in the world.',
		);
		const archetype =
			this.#world.archetypes[this.getTableIndex(entityId)].bitfield;
		const componentBit = 1n << BigInt(componentId);
		return (archetype & componentBit) === componentBit;
	}

	resetCursor(): void {
		const { u32 } = memory.views;
		u32[this.#pointer + 1] = 0;
		if (u32[this.#pointer] >= this.#capacity) {
			const newElementCount =
				Math.ceil((u32[this.#pointer] + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			memory.reallocAt((this.#pointer + 2) << 2, newElementCount * 8);
			u32[this.#pointer + 3] = newElementCount;
		}
	}

	getTableIndex(entityId: bigint): number {
		return memory.views.u32[this.#getOffset(entityId)] ?? 0;
	}
	setTableIndex(entityId: bigint, tableIndex: number): void {
		memory.views.u32[this.#getOffset(entityId)] = tableIndex;
	}

	getRow(entityId: bigint): number {
		return memory.views.u32[this.#getOffset(entityId) + 1] ?? 0;
	}
	setRow(entityId: bigint, row: number): void {
		memory.views.u32[this.#getOffset(entityId) + 1] = row;
	}

	getBitset(entityId: bigint): bigint {
		return this.#world.archetypes[this.getTableIndex(entityId)].bitfield;
	}

	get #locationsPointer() {
		return memory.views.u32[this.#pointer + 2];
	}
	get #capacity() {
		return memory.views.u32[this.#pointer + 3];
	}
	set #capacity(val: number) {
		memory.views.u32[this.#pointer + 3] = val;
	}

	#getOffset(entityId: bigint) {
		return (this.#locationsPointer >> 2) + (getIndex(entityId) << 1);
	}

	/**
	 * Atomically grabs the current cursor.
	 * @returns The current cursor value.
	 */
	#getCursor() {
		return Atomics.load(memory.views.u32, this.#pointer + 1);
	}

	/**
	 * Tries to atomically move the cursor by one.
	 * @param expected The value the cursor is currently expected to be.
	 * @returns A boolean, indicating if the move was successful or not.
	 */
	#tryCursorMove(expected: number) {
		return (
			expected ===
			Atomics.compareExchange(
				memory.views.u32,
				this.#pointer + 1,
				expected,
				expected + 1,
			)
		);
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
		const recycledTable = world.archetypes[1];

		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(2n);

		recycledTable.length = 3;

		const ptr = recycledTable.getColumn(Entity);

		memory.views.u64[(ptr >> 3) + 0] = 0n;
		memory.views.u64[(ptr >> 3) + 1] = 1n;
		memory.views.u64[(ptr >> 3) + 2] = 2n;

		expect(entities.spawn()).toBe(0n + ONE_GENERATION);
		expect(entities.spawn()).toBe(1n + ONE_GENERATION);
		expect(entities.spawn()).toBe(2n + ONE_GENERATION);
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
