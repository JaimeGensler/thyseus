import { Entity } from './Entity';
import { createStore } from './createStore';
import { resizeStore } from './resizeStore';
import type { World } from '../World';
import type { ComponentStore, ComponentType } from './types';

export class Table {
	columns: Map<ComponentType, ComponentStore>;
	meta: Uint32Array;

	static create(world: World, components: ComponentType[]) {
		const meta = new Uint32Array(2);
		meta[1] = world.config.getNewTableSize(0);
		return new this(
			components.reduce(
				(acc, component) =>
					acc.set(component, createStore(world, component)),
				new Map<ComponentType, ComponentStore>(),
			),
			meta,
		);
	}

	constructor(
		columns: Map<ComponentType, ComponentStore>,
		meta: Uint32Array,
	) {
		this.columns = columns;
		this.meta = meta;
	}

	get size() {
		return this.meta[0];
	}
	set size(value: number) {
		this.meta[0] = value;
	}
	get capacity() {
		return this.meta[1];
	}
	set capacity(val: number) {
		this.meta[1] = val;
	}
	get isFull() {
		return this.capacity === this.size;
	}

	add(entityId: bigint) {
		this.columns.get(Entity)!.val[this.size++] = entityId;
	}
	delete(index: number) {
		for (const [, store] of this.columns) {
			for (const key in store) {
				store[key][index] = store[key][this.size - 1];
			}
		}
		this.size--;
	}
	move(index: number, targetTable: Table) {
		for (const [ComponentType, store] of this.columns) {
			if (targetTable.columns.has(ComponentType)) {
				const targetStore = targetTable.columns.get(ComponentType)!;
				for (const key in store) {
					targetStore[key][targetTable.size] = store[key][index];
					store[key][index] = store[key][this.size - 1];
				}
			}
		}
		targetTable.size++;
		this.size--;
	}

	grow(world: World) {
		this.capacity = world.config.getNewTableSize(this.capacity);
		for (const [ComponentType, store] of this.columns) {
			this.columns.set(
				ComponentType,
				resizeStore(world, ComponentType, this.capacity, store),
			);
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('./struct');

	@struct()
	class Vec3 {
		static schema = {};
		static size = 0;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
	}

	const mockWorld: World = {
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: (n: number) => (n === 0 ? 8 : n * 2),
		},
	} as any;

	it('adds an element', () => {
		const table = Table.create(mockWorld, [Entity]);
		expect(table.size).toBe(0);
		expect(table.capacity).toBe(8);
		expect(table.isFull).toBe(false);
		table.add(0n);
		expect(table.columns.get(Entity)!.val[0]).toBe(0n);
		expect(table.size).toBe(1);
		table.add(3n);
		expect(table.columns.get(Entity)!.val[0]).toBe(0n);
		expect(table.columns.get(Entity)!.val[1]).toBe(3n);
		expect(table.size).toBe(2);
	});

	it('isFull is true when no more elements can be added', () => {
		const table = Table.create(mockWorld, [Entity]);
		for (let i = 0; i < 8; i++) {
			expect(table.isFull).toBe(false);
			table.add(BigInt(i));
		}
		expect(table.isFull).toBe(true);
	});

	it('moves elements from one table to another', () => {
		const fromTable = Table.create(mockWorld, [Entity, Vec3]);
		const toTable = Table.create(mockWorld, [Entity, Vec3]);
		fromTable.add(3n);
		fromTable.add(1n);
		toTable.add(4n);
		const fromStore = fromTable.columns.get(Vec3)!;
		const toStore = toTable.columns.get(Vec3)!;
		fromStore.x[0] = 1;
		fromStore.y[0] = 2;
		fromStore.z[0] = 3;
		fromStore.x[1] = 7;
		fromStore.y[1] = 8;
		fromStore.z[1] = 9;

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		expect(toStore.x[0]).toBe(0);
		expect(toStore.y[0]).toBe(0);
		expect(toStore.z[0]).toBe(0);
		expect(fromTable.columns.get(Entity)!.val[0]).toBe(3n);

		fromTable.move(0, toTable);

		expect(fromTable.size).toBe(1);
		expect(toTable.size).toBe(2);
		expect(toStore.x[1]).toBe(1);
		expect(toStore.y[1]).toBe(2);
		expect(toStore.z[1]).toBe(3);
		expect(fromStore.x[0]).toBe(7);
		expect(fromStore.y[0]).toBe(8);
		expect(fromStore.z[0]).toBe(9);
		expect(fromTable.columns.get(Entity)!.val[0]).toBe(1n);
	});

	it('deletes elements, swaps in last elements', () => {
		const table = Table.create(mockWorld, [Entity, Vec3]);
		table.add(31n);
		table.add(13n);
		const vecStore = table.columns.get(Vec3)!;
		vecStore.x[0] = 1;
		vecStore.y[0] = 2;
		vecStore.z[0] = 3;
		vecStore.x[1] = 7;
		vecStore.y[1] = 8;
		vecStore.z[1] = 9;

		expect(table.size).toBe(2);

		expect(table.columns.get(Entity)!.val[0]).toBe(31n);

		table.delete(0);

		expect(table.size).toBe(1);
		expect(vecStore.x[0]).toBe(7);
		expect(vecStore.y[0]).toBe(8);
		expect(vecStore.z[0]).toBe(9);
		expect(table.columns.get(Entity)!.val[0]).toBe(13n);
	});

	it('grows correctly', () => {
		const table = Table.create(mockWorld, [Entity]);

		table.add(1n);

		expect(table.capacity).toBe(8);
		expect(table.columns.get(Entity)!.val).toHaveLength(8);
		expect(table.columns.get(Entity)!.val[0]).toBe(1n);
		table.grow(mockWorld);
		expect(table.capacity).toBe(16);
		expect(table.columns.get(Entity)!.val).toHaveLength(16);
		expect(table.columns.get(Entity)!.val[0]).toBe(1n);
	});
}
