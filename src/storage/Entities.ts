import { Entity } from './Entity';
import type { Table } from './Table';
import type { World } from '../world';

const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;
const ENTITY_BATCH_SIZE = 256;

export class Entities {
	static fromWorld(world: World): Entities {
		return new this(
			world,
			world.threads.queue(() => {
				const ptr = world.memory.alloc(4 * 4);
				world.memory.views.u32[(ptr >> 2) + 2] = world.memory.alloc(
					8 * ENTITY_BATCH_SIZE,
				);
				world.memory.views.u32[(ptr >> 2) + 3] = ENTITY_BATCH_SIZE;
				return ptr;
			}),
		);
	}

	#data: Uint32Array; // [nextId, cursor, pointer, length]
	#world: World;
	#pointer: number;
	#recycled: Table;
	constructor(world: World, pointer: number) {
		this.#data = world.memory.views.u32;
		this.#pointer = pointer >> 2;
		this.#world = world;
		this.#recycled = world.archetypes[1];
	}

	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint {
		const recycledSize = this.#recycled.size;
		for (
			let currentCursor = this.#getCursor();
			currentCursor < recycledSize;
			currentCursor = this.#getCursor()
		) {
			if (this.#tryCursorMove(currentCursor)) {
				return this.#recycled.columns.get(Entity)!.u64![
					recycledSize - currentCursor - 1
				];
			}
		}
		return BigInt(Atomics.add(this.#data, this.#pointer, 1));
	}

	/**
	 * Checks if an entity is currently alive or not.
	 * @param entityId The entity id to check
	 * @returns `true` if alive, `false` if not.
	 */
	isAlive(entityId: bigint) {
		const tableIndex = this.getTableIndex(entityId);
		const row = this.getRow(entityId);
		return (
			tableIndex === 0 ||
			this.#world.archetypes[tableIndex].columns.get(Entity)!.u64![
				row
			] === entityId
		);
	}

	resetCursor() {
		this.#data[this.#pointer + 1] = 0;
		if (this.#data[this.#pointer] >= this.#data[this.#pointer + 3]) {
			const newElementCount =
				Math.ceil((this.#data[this.#pointer] + 1) / ENTITY_BATCH_SIZE) *
				ENTITY_BATCH_SIZE;
			this.#locationsPointer = this.#world.memory.realloc(
				this.#locationsPointer,
				newElementCount * 8,
			);
			this.#data[this.#pointer + 3] = newElementCount;
		}
	}

	getTableIndex(entityId: bigint) {
		return this.#data[this.#getOffset(entityId)] ?? 0;
	}
	setTableIndex(entityId: bigint, tableIndex: number) {
		this.#data[this.#getOffset(entityId)] = tableIndex;
	}

	getRow(entityId: bigint) {
		return this.#data[this.#getOffset(entityId) + 1] ?? 0;
	}
	setRow(entityId: bigint, row: number) {
		this.#data[this.#getOffset(entityId) + 1] = row;
	}

	get #locationsPointer() {
		return this.#data[this.#pointer + 2];
	}
	set #locationsPointer(val: number) {
		this.#data[this.#pointer + 2] = val;
	}
	#getOffset(entityId: bigint) {
		return (this.#locationsPointer >> 2) + (Number(entityId & lo32) << 1);
	}

	/**
	 * Atomically grabs the current cursor.
	 * @returns The current cursor value.
	 */
	#getCursor() {
		return Atomics.load(this.#data, this.#pointer + 1);
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
				this.#data,
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
	const { it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { Memory } = await import('../utils/memory');
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

	const createWorld = () => World.new().build();

	it('returns incrementing generational integers', async () => {
		const world = await createWorld();
		const entities = world.entities;

		for (let i = 0n; i < 256n; i++) {
			expect(entities.spawn()).toBe(i);
		}
	});

	it('returns entities from the Recycled table', async () => {
		const world = await createWorld();
		const entities = world.entities;
		const table = world.archetypes[1];

		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(2n);

		table.size = 3;
		table.columns.get(Entity)!.u64![0] = 0n;
		table.columns.get(Entity)!.u64![1] = 1n;
		table.columns.get(Entity)!.u64![2] = 2n;

		expect(entities.spawn()).toBe(2n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(3n);
	});

	it('reset grows by at least as many entities have been spawned', async () => {
		const reallocSpy = vi.spyOn(Memory.prototype, 'realloc');
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
}
