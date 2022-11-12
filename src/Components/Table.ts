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
		this.columns.get(Entity)!.u64![this.size++] = entityId;
	}
	delete(index: number) {
		this.size--;
		for (const [ComponentType, store] of this.columns) {
			store.u8.copyWithin(
				index,
				this.size * ComponentType.size!,
				this.size * ComponentType.size! + ComponentType.size!,
			);
			store.u8.fill(
				0,
				this.size * ComponentType.size!,
				this.size * ComponentType.size! + ComponentType.size!,
			);
		}
	}
	move(index: number, targetTable: Table) {
		for (const [ComponentType, store] of this.columns) {
			if (targetTable.columns.has(ComponentType)) {
				targetTable.columns
					.get(ComponentType)!
					.u8.set(
						store.u8.slice(
							index * ComponentType.size!,
							index * ComponentType.size! + ComponentType.size!,
						),
						targetTable.size * ComponentType.size!,
					);
			}
		}
		this.delete(index);
		targetTable.size++;
	}

	grow(world: World) {
		this.capacity = world.config.getNewTableSize(this.capacity);
		for (const [ComponentType, store] of this.columns) {
			this.columns.set(
				ComponentType,
				resizeStore(store, ComponentType, this.capacity),
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
		declare static schema: number;
		declare static size: number;
		declare store: ComponentStore;
		declare index: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: ComponentStore, index: number) {}
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
		expect(table.columns.get(Entity)!.u64![0]).toBe(0n);
		expect(table.size).toBe(1);
		table.add(3n);
		expect(table.columns.get(Entity)!.u64![0]).toBe(0n);
		expect(table.columns.get(Entity)!.u64![1]).toBe(3n);
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

	it.only('moves elements from one table to another', () => {
		const fromTable = Table.create(mockWorld, [Entity, Vec3]);
		const toTable = Table.create(mockWorld, [Entity, Vec3]);

		fromTable.add(3n);
		fromTable.add(1n);
		toTable.add(4n);

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(3n);

		const from = new Vec3(fromTable.columns.get(Vec3)!, 0);
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.index = 1;
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

		to.index = 1;
		expect(to.x).toBe(1);
		expect(to.y).toBe(2);
		expect(to.z).toBe(3);

		from.index = 0;
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
		expect(fromTable.columns.get(Entity)!.u64![0]).toBe(1n);
	});

	it('deletes elements, swaps in last elements', () => {
		const table = Table.create(mockWorld, [Entity, Vec3]);
		table.add(31n);
		table.add(13n);
		expect(table.size).toBe(2);
		expect(table.columns.get(Entity)!.u64![0]).toBe(31n);

		const vec = new Vec3(table.columns.get(Vec3)!, 0);
		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vec.index = 1;
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;

		table.delete(0);

		expect(table.size).toBe(1);
		vec.index = 0;
		expect(vec.x).toBe(7);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(9);
		expect(table.columns.get(Entity)!.u64![0]).toBe(13n);
	});

	it('grows correctly', () => {
		const table = Table.create(mockWorld, [Entity]);

		table.add(1n);

		expect(table.capacity).toBe(8);
		expect(table.columns.get(Entity)!.u64!).toHaveLength(8);
		expect(table.columns.get(Entity)!.u64![0]).toBe(1n);
		table.grow(mockWorld);
		expect(table.capacity).toBe(16);
		expect(table.columns.get(Entity)!.u64!).toHaveLength(16);
		expect(table.columns.get(Entity)!.u64![0]).toBe(1n);
	});

	it.todo('backfills elements for all stores', () => {
		// v0.6 changelog bugfix
	});
}
