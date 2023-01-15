import { Entity } from './Entity';
import { createStore, resizeStore } from './store';
import type { World } from '../world';
import type { StructStore, Struct } from '../struct';

export class Table {
	static create(
		world: World,
		components: Struct[],
		bitfield: bigint,
		id: number,
	) {
		const capacity = world.config.getNewTableSize(0);
		return new this(
			world,
			components.reduce((acc, component) => {
				if (component.size! > 0) {
					acc.set(
						component,
						createStore(world.buffer, component, capacity),
					);
				}
				return acc;
			}, new Map<Struct, StructStore>()),
			capacity,
			bitfield,
			id,
		);
	}

	#world: World;
	columns: Map<Struct, StructStore>;
	capacity: number;
	bitfield: bigint;
	#id: number;
	constructor(
		world: World,
		columns: Map<Struct, StructStore>,
		capacity: number,
		bitfield: bigint,
		id: number,
	) {
		this.#world = world;
		this.columns = columns;
		this.capacity = capacity;
		this.bitfield = bitfield;
		this.#id = id;
	}

	get id() {
		return this.#id;
	}
	get size() {
		return this.#world.tableLengths[this.#id];
	}
	set size(value: number) {
		this.#world.tableLengths[this.#id] = value;
	}
	get isFull() {
		return this.capacity === this.size;
	}

	delete(index: number) {
		this.size--;
		for (const [struct, store] of this.columns) {
			store.u8.copyWithin(
				index * struct.size!,
				this.size * struct.size!,
				this.size * struct.size! + struct.size!,
			);
			store.u8.fill(
				0,
				this.size * struct.size!,
				this.size * struct.size! + struct.size!,
			);
		}
	}

	move(index: number, targetTable: Table) {
		const lastEntity = this.columns.get(Entity)!.u64![this.size - 1];
		for (const [struct, store] of this.columns) {
			if (targetTable.columns.has(struct)) {
				targetTable.columns
					.get(struct)!
					.u8.set(
						store.u8.slice(
							index * struct.size!,
							index * struct.size! + struct.size!,
						),
						targetTable.size * struct.size!,
					);
			}
		}
		targetTable.size++;
		this.delete(index);
		return lastEntity;
	}

	grow(world: World) {
		this.capacity = world.config.getNewTableSize(this.capacity);
		for (const [struct, store] of this.columns) {
			this.columns.set(struct, resizeStore(store, struct, this.capacity));
		}
	}

	incrementGeneration(row: number) {
		this.columns.get(Entity)!.u32![(row << 1) + 1]++;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('../struct');
	const { UncreatedEntitiesTable } = await import('./UncreatedEntitiesTable');

	const uncreated = new UncreatedEntitiesTable({} as any);

	@struct()
	class Vec3 {
		declare static schema: number;
		declare static size: number;
		declare __$$s: StructStore;
		declare __$$b: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor() {}
	}

	const mockWorld: World = {
		buffer: ArrayBuffer,
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: (n: number) => (n === 0 ? 8 : n * 2),
		},
	} as any;
	const createTable = (...components: Struct[]) =>
		Table.create(
			{ ...mockWorld, tableLengths: new Uint32Array(1) } as any,
			components,
			0n,
			0,
		);

	it('adds an element', () => {
		const table = createTable(Entity);
		expect(table.size).toBe(0);
		expect(table.capacity).toBe(8);
		expect(table.isFull).toBe(false);
		uncreated.move(0, table);
		expect(table.columns.get(Entity)!.u64![0]).toBe(0n);
		expect(table.size).toBe(1);
		uncreated.move(3, table);
		expect(table.columns.get(Entity)!.u64![0]).toBe(0n);
		expect(table.columns.get(Entity)!.u64![1]).toBe(3n);
		expect(table.size).toBe(2);
	});

	it('isFull is true when no more elements can be added', () => {
		const table = createTable(Entity);
		for (let i = 0; i < 8; i++) {
			expect(table.isFull).toBe(false);
			uncreated.move(i, table);
		}
		expect(table.isFull).toBe(true);
	});

	it('moves elements from one table to another', () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity, Vec3);

		uncreated.move(3, fromTable);
		uncreated.move(1, fromTable);
		uncreated.move(4, toTable);

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(3n);

		const from = new Vec3();
		from.__$$s = fromTable.columns.get(Vec3)!;
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$b = Vec3.size;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		const to = new Vec3();
		to.__$$s = toTable.columns.get(Vec3)!;
		expect(to.x).toBe(0);
		expect(to.y).toBe(0);
		expect(to.z).toBe(0);

		fromTable.move(0, toTable);

		expect(fromTable.size).toBe(1);
		expect(toTable.size).toBe(2);

		to.__$$b = Vec3.size;
		expect(to.x).toBe(1);
		expect(to.y).toBe(2);
		expect(to.z).toBe(3);

		from.__$$b = 0;
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(1n);
	});

	it('deletes elements, swaps in last elements', () => {
		const table = createTable(Entity, Vec3);
		const vec = new Vec3();
		vec.__$$s = table.columns.get(Vec3)!;
		const ent = new Entity({} as any);
		(ent as any).__$$s = table.columns.get(Entity)!;

		uncreated.move(1, table);
		uncreated.move(2, table);
		uncreated.move(3, table);
		uncreated.move(4, table);
		expect(table.size).toBe(4);

		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vec.__$$b = Vec3.size;
		vec.x = 4;
		vec.y = 5;
		vec.z = 6;
		vec.__$$b = Vec3.size * 2;
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;
		vec.__$$b = Vec3.size * 3;
		vec.x = 10;
		vec.y = 11;
		vec.z = 12;

		table.delete(1);
		expect(table.size).toBe(3);

		vec.__$$b = 0;
		(ent as any).__$$b = 0;
		expect(ent.id).toBe(1n);
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);
		vec.__$$b = Vec3.size;
		(ent as any).__$$b = Entity.size;
		expect(ent.id).toBe(4n);
		expect(vec.x).toBe(10);
		expect(vec.y).toBe(11);
		expect(vec.z).toBe(12);
		vec.__$$b = Vec3.size * 2;
		(ent as any).__$$b = Entity.size * 2;
		expect(ent.id).toBe(3n);
		expect(vec.x).toBe(7);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(9);
	});

	it('grows correctly', () => {
		const table = createTable(Entity);

		uncreated.move(1, table);

		expect(table.capacity).toBe(8);
		expect(table.columns.get(Entity)!.u64!).toHaveLength(8);
		expect(table.columns.get(Entity)!.u64![0]).toBe(1n);
		table.grow(mockWorld);
		expect(table.capacity).toBe(16);
		expect(table.columns.get(Entity)!.u64!).toHaveLength(16);
		expect(table.columns.get(Entity)!.u64![0]).toBe(1n);
	});

	// v0.6 changelog bugfix
	it('backfills elements for ALL stores', () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity);

		uncreated.move(3, fromTable);
		uncreated.move(1, fromTable);
		uncreated.move(4, toTable);

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(3n);

		const from = new Vec3();
		from.__$$s = fromTable.columns.get(Vec3)!;
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$b = Vec3.size;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		fromTable.move(0, toTable);

		const to = new Entity({} as any);
		(to as any).__$$s = toTable.columns.get(Entity)!;
		(to as any).__$$b = Entity.size;
		expect(to.id).toBe(3n);

		from.__$$b = 0;
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(1n);
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
	});

	// v0.6 changelog bugfix
	it('does not contain stale data when adding element', () => {
		const table = createTable(Entity, Vec3);

		uncreated.move(25, table);
		uncreated.move(233, table);

		const vec = new Vec3();
		vec.__$$s = table.columns.get(Vec3)!;
		const ent = new Entity({} as any);
		(ent as any).__$$s = table.columns.get(Entity)!;
		vec.x = 100;
		vec.y = 200;
		vec.z = 300;
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		vec.__$$b = Vec3.size;
		vec.x = Math.PI;
		vec.y = Math.PI;
		vec.z = Math.PI;

		table.delete(1);
		uncreated.move(26, table);

		vec.__$$b = 0;
		//@ts-ignore
		ent.__$$b = 0;
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		expect(ent.id).toBe(25n);

		vec.__$$b = Vec3.size;
		//@ts-ignore
		ent.__$$b = Entity.size;
		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);
		expect(ent.id).toBe(26n);
	});

	// v0.6 changelog bugfix
	it('does not create columns for ZSTs', () => {
		class ZST {
			static size = 0;
			static alignment = 1;
			static schema = 0;
		}
		const table = createTable(Entity, Vec3, ZST);
		expect(table.columns.size).toBe(2);
		expect(table.columns.has(ZST)).toBe(false);
	});

	it('increments generations', () => {
		const table = createTable(Entity);
		const ent = new Entity();
		(ent as any).__$$s = table.columns.get(Entity)!;
		expect(ent.generation).toBe(0);
		table.incrementGeneration(0);
		expect(ent.generation).toBe(1);
		table.incrementGeneration(0);
		expect(ent.generation).toBe(2);
		table.incrementGeneration(1);
		expect(ent.generation).toBe(2);
		expect(ent.id).toBe(0x00000002_00000000n);
		//@ts-ignore
		ent.__$$b = Entity.size;
		expect(ent.generation).toBe(1);
		expect(ent.id).toBe(0x00000001_00000000n);
		//@ts-ignore
		ent.__$$b = Entity.size * 2;
		expect(ent.generation).toBe(0);
		expect(ent.id).toBe(0x00000000_00000000n);
	});
}
