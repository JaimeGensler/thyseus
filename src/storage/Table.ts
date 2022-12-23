import { Entity } from './Entity';
import { createStore, resizeStore } from './store';
import type { World } from '../World';
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
					acc.set(component, createStore(world, component, capacity));
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
		declare store: StructStore;
		declare __$$i: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: StructStore, index: number) {}
	}

	const mockWorld: World = {
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

		const from = new Vec3(fromTable.columns.get(Vec3)!, 0);
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$i = 1;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		const to = new Vec3(toTable.columns.get(Vec3)!, 0);
		expect(to.x).toBe(0);
		expect(to.y).toBe(0);
		expect(to.z).toBe(0);

		fromTable.move(0, toTable);

		expect(fromTable.size).toBe(1);
		expect(toTable.size).toBe(2);

		to.__$$i = 1;
		expect(to.x).toBe(1);
		expect(to.y).toBe(2);
		expect(to.z).toBe(3);

		from.__$$i = 0;
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(1n);
	});

	it('deletes elements, swaps in last elements', () => {
		const table = createTable(Entity, Vec3);
		const vec = new Vec3(table.columns.get(Vec3)!, 0);
		const ent = new Entity(table.columns.get(Entity)!, 0, {} as any);

		uncreated.move(1, table);
		uncreated.move(2, table);
		uncreated.move(3, table);
		uncreated.move(4, table);
		expect(table.size).toBe(4);

		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vec.__$$i = 1;
		vec.x = 4;
		vec.y = 5;
		vec.z = 6;
		vec.__$$i = 2;
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;
		vec.__$$i = 3;
		vec.x = 10;
		vec.y = 11;
		vec.z = 12;

		table.delete(1);
		expect(table.size).toBe(3);

		vec.__$$i = 0;
		(ent as any).__$$i = 0;
		expect(ent.id).toBe(1n);
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);
		vec.__$$i = 1;
		(ent as any).__$$i = 1;
		expect(ent.id).toBe(4n);
		expect(vec.x).toBe(10);
		expect(vec.y).toBe(11);
		expect(vec.z).toBe(12);
		vec.__$$i = 2;
		(ent as any).__$$i = 2;
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

		const from = new Vec3(fromTable.columns.get(Vec3)!, 0);
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$i = 1;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		fromTable.move(0, toTable);

		const to = new Entity(toTable.columns.get(Entity)!, 1, {} as any);
		expect(to.id).toBe(3n);

		from.__$$i = 0;
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

		const vec = new Vec3(table.columns.get(Vec3)!, 0);
		const ent = new Entity(table.columns.get(Entity)!, 0, {} as any);
		vec.x = 100;
		vec.y = 200;
		vec.z = 300;
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		vec.__$$i = 1;
		vec.x = Math.PI;
		vec.y = Math.PI;
		vec.z = Math.PI;

		table.delete(1);
		uncreated.move(26, table);

		vec.__$$i = 0;
		//@ts-ignore
		ent.__$$i = 0;
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		expect(ent.id).toBe(25n);

		vec.__$$i = 1;
		//@ts-ignore
		ent.__$$i = 1;
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
		const ent = new Entity(table.columns.get(Entity)!, 0, {} as any);
		expect(ent.generation).toBe(0);
		table.incrementGeneration(0);
		expect(ent.generation).toBe(1);
		table.incrementGeneration(0);
		expect(ent.generation).toBe(2);
		table.incrementGeneration(1);
		expect(ent.generation).toBe(2);
		expect(ent.id).toBe(0x00000002_00000000n);
		//@ts-ignore
		ent.__$$i = 1;
		expect(ent.generation).toBe(1);
		expect(ent.id).toBe(0x00000001_00000000n);
		//@ts-ignore
		ent.__$$i = 2;
		expect(ent.generation).toBe(0);
		expect(ent.id).toBe(0x00000000_00000000n);
	});
}
