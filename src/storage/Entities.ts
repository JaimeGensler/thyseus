import { memory } from '../utils/memory';
import { Entity } from './Entity';
import type { Table } from './Table';
import type { World } from '../world';

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
				const ptr = memory.alloc(4 * 4);
				u32[(ptr >> 2) + 2] = memory.alloc(8 * ENTITY_BATCH_SIZE);
				u32[(ptr >> 2) + 3] = ENTITY_BATCH_SIZE;
				return ptr;
			}),
		);
	}

	#world: World;
	#pointer: number;
	#recycled: Table;
	constructor(world: World, pointer: number) {
		this.#pointer = pointer >> 2;
		this.#world = world;
		this.#recycled = world.archetypes[1];
	}

	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint {
		const { u32, u64 } = memory.views;
		const recycledSize = this.#recycled.size;
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
				tableIndex === 1 ||
				u64[(ptr >> 3) + row] === entityId)
		);
	}

	resetCursor(): void {
		const { u32 } = memory.views;
		u32[this.#pointer + 1] = 0;
		if (u32[this.#pointer] >= u32[this.#pointer + 3]) {
			const newElementCount =
				Math.ceil((u32[this.#pointer] + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			this.#locationsPointer = memory.realloc(
				this.#locationsPointer,
				newElementCount * 8,
			);
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
	set #locationsPointer(val: number) {
		memory.views.u32[this.#pointer + 2] = val;
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
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

	const createWorld = () => World.new().build();

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

		recycledTable.size = 3;

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
		const reallocSpy = vi.spyOn(memory, 'realloc');
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
		expect(reallocSpy).toHaveBeenCalledWith(192, 4096);

		reallocSpy.mockReset();

		for (let i = 0; i < ENTITY_BATCH_SIZE * 2; i++) {
			entities.spawn();
		}
		entities.resetCursor();
		expect(reallocSpy).toHaveBeenCalledOnce();
		expect(reallocSpy).toHaveBeenCalledWith(2312, 8192);
	});
}
