import { Entity, type Table } from '.';
import type { World } from '../World/World';

const NEXT_ID = 0;
const CURSOR = 1;
const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;
const getIndex = (id: bigint): number => Number(id & lo32);

const ENTITY_BATCH_SIZE = 256;

export class Entities {
	static fromWorld(world: World): Entities {
		return new this(
			world.threads.queue(
				() =>
					new Uint32Array(
						world.createBuffer(
							ENTITY_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT,
						),
					),
			),
			world.threads.queue(() => new Uint32Array(world.createBuffer(8))),
			world.archetypes[0],
		);
	}

	#locations: Uint32Array;
	#data: Uint32Array; // [NEXT_ID, CURSOR]
	#recycled: Table;
	constructor(locations: Uint32Array, data: Uint32Array, recycled: Table) {
		this.#locations = locations;
		this.#data = data;
		this.#recycled = recycled;
	}

	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint {
		let currentCursor = Atomics.load(this.#data, CURSOR);
		const recycledSize = this.#recycled.size;
		while (currentCursor < recycledSize) {
			const preExchangeValue = Atomics.compareExchange(
				this.#data,
				CURSOR,
				currentCursor,
				currentCursor + 1,
			);
			if (currentCursor === preExchangeValue) {
				return this.#recycled.columns.get(Entity)!.u64![
					recycledSize - currentCursor - 1
				];
			}
			currentCursor = Atomics.load(this.#data, CURSOR);
		}
		return BigInt(Atomics.add(this.#data, NEXT_ID, 1));
	}

	resetCursor() {
		this.#data[CURSOR] = 0;
	}

	grow(world: World) {
		// TODO
	}

	getTableIndex(entityId: bigint): number {
		return this.#locations[getIndex(entityId) << 1] ?? 0;
	}
	setTableIndex(entityId: bigint, tableIndex: number) {
		this.#locations[getIndex(entityId) << 1] = tableIndex;
	}

	getRow(entityId: bigint): number {
		return this.#locations[(getIndex(entityId) << 1) + 1] ?? 0;
	}
	setRow(entityId: bigint, row: number) {
		this.#locations[(getIndex(entityId) << 1) + 1] = row;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { Table } = await import('.');

	it('returns incrementing generational integers', () => {
		const entities = new Entities(
			new Uint32Array(256 * 2),
			new Uint32Array(3),
			new Table(new Map(), 0, new Uint32Array(1), 0),
		);

		for (let i = 0n; i < 256n; i++) {
			expect(entities.spawn()).toBe(i);
		}
	});

	it('returns entities from the Recycled table', () => {
		const table = new Table(
			new Map().set(Entity, { u64: new BigUint64Array(8) }),
			0,
			new Uint32Array(1),
			0,
		);

		const entities = new Entities(
			new Uint32Array(256 * 2),
			new Uint32Array(3),
			table,
		);

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
}