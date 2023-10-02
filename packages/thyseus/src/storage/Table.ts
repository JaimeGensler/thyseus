import { Entity } from '../entities/Entity';
import { Store } from './Store';
import type { Struct, StructInstance, u64 } from '../struct';

export class Table {
	static createEmpty(): Table {
		const table = new this([], 0n, 0);
		table.length = 2 ** 32 - 1;
		return table;
	}

	id: number;
	archetype: bigint;

	length: number = 0;
	capacity: number = 0;
	#components: Struct[];
	#columns: Store[];
	constructor(components: Struct[], archetype: bigint, id: number) {
		this.#components = components.filter(component => component.size! > 0);
		this.archetype = archetype;
		this.id = id;
		this.#columns = this.#components.map(() => new Store(0));
	}

	hasColumn(componentType: Struct): boolean {
		return this.#components.includes(componentType);
	}

	add(entityId: bigint) {
		const entityStore = this.#columns[0];
		entityStore.offset = this.length * Entity.size;
		entityStore.writeU64(entityId);
		for (const column of this.#columns) {
			column.length++;
		}
		this.length++;
	}

	delete(row: number): void {
		this.length--;
		for (let i = 0; i < this.#columns.length; i++) {
			const column = this.#columns[i];
			const size = this.#components[i].size!;
			const lastElement = this.length * size;
			column.copyWithin(lastElement, size, row * size!);
			column.length--;
		}
	}

	/**
	 * Moves the entity at `row` and all its associated data into `targetTable`.
	 * Returns the id of the entity in this table that was backfilled.
	 * @param row The row of the entity to move.
	 * @param targetTable The table to move that entity to.
	 * @returns The id of the backfilled entity.
	 */
	move(row: number, targetTable: Table): u64 {
		const entityColumn = this.#columns[0];
		const lastEntity =
			entityColumn.u64[((this.length - 1) * Entity.size!) >> 3];
		for (let i = 0; i < this.#columns.length; i++) {
			const component = this.#components[i];
			const size = component.size!;
			if (targetTable.hasColumn(component)) {
				const targetColumn = targetTable.getColumn(component);
				targetColumn.copyFrom(
					this.#columns[i],
					size,
					row * size,
					targetTable.length * size,
				);
				targetColumn.length++;
			}
		}
		targetTable.length++;
		this.delete(row);
		return lastEntity;
	}

	/**
	 * Resizes this `Table` to have a room for `newCapacity` elements.
	 * Can be used to grow or shrink.
	 * @param newCapacity The number of elements each column of this table should have room for.
	 */
	resize(newCapacity: number): void {
		this.capacity = newCapacity;
		for (let i = 0; i < this.#columns.length; i++) {
			const column = this.#columns[i];
			const component = this.#components[i];
			column.resize(newCapacity * component.size!);
		}
	}

	copyDataIntoRow(row: number, componentType: Struct, store: Store): void {
		if (this.hasColumn(componentType)) {
			const size = componentType.size!;
			const column = this.getColumn(componentType);
			column.copyFrom(store, size, store.offset, row * size);
		}
	}

	getColumn(componentType: Struct): Store {
		return this.#columns[this.#components.indexOf(componentType)];
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	class Vec3 {
		static size = 24;
		static alignment = 8;
		deserialize(store: Store) {
			this.x = store.readF64();
			this.y = store.readF64();
			this.z = store.readF64();
		}
		serialize(store: Store) {
			store.writeF64(this.x);
			store.writeF64(this.y);
			store.writeF64(this.z);
		}
		x: number = 0;
		y: number = 0;
		z: number = 0;
	}

	const createTable = (...components: Struct[]) =>
		new Table(components, 0n, 0);

	it('add() adds an item', async () => {
		const table = createTable(Entity);
		const entityColumn = table.getColumn(Entity);
		expect(table.length).toBe(0);
		expect(table.capacity).toBe(0);
		table.resize(8);

		const id1 = 4n;
		const id2 = (1n << 32n) | 5n;
		table.add(id1);
		table.add(id2);

		entityColumn.offset = 0;
		const entity = new Entity();
		entity.deserialize(entityColumn);
		expect(entity.id).toBe(id1);
		entity.deserialize(entityColumn);
		expect(entity.id).toBe(id2);
	});

	it('adds an element', async () => {
		const table = createTable(Entity);
		expect(table.length).toBe(0);
		expect(table.capacity).toBe(0);

		table.resize(8);
		table.add(0n);
		expect(table.length).toBe(1);
		expect(table.capacity).toBe(8);

		const entity = new Entity();
		const entityColumn = table.getColumn(Entity);
		entityColumn.offset = 0;
		entity.deserialize(entityColumn);
		expect(entity.id).toBe(0n);

		table.add(3n);
		entityColumn.offset = 0;
		entity.deserialize(entityColumn);
		expect(entity.id).toBe(0n);

		entity.deserialize(entityColumn);
		expect(entity.id).toBe(3n);
		expect(table.length).toBe(2);
	});

	it('moves elements from one table to another', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity, Vec3);
		fromTable.resize(8);
		toTable.resize(8);

		fromTable.add(3n);
		fromTable.add(1n);
		toTable.add(4n);

		const ent = new Entity();

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);
		const fromTableEntityColumn = fromTable.getColumn(Entity);
		fromTableEntityColumn.offset = 0;
		ent.deserialize(fromTableEntityColumn);
		expect(ent.id).toBe(3n);

		const fromTableVec3Column = fromTable.getColumn(Vec3);
		fromTableVec3Column.offset = 0;
		const v3 = new Vec3();
		v3.x = 1;
		v3.y = 2;
		v3.z = 3;
		v3.serialize(fromTableVec3Column);
		v3.x = 7;
		v3.y = 8;
		v3.z = 9;
		v3.serialize(fromTableVec3Column);

		const toTableVec3Column = toTable.getColumn(Vec3);
		toTableVec3Column.offset = 0;
		v3.deserialize(toTableVec3Column);
		expect(v3.x).toBe(0);
		expect(v3.y).toBe(0);
		expect(v3.z).toBe(0);

		fromTable.move(0, toTable);

		expect(fromTable.length).toBe(1);
		expect(toTable.length).toBe(2);

		v3.deserialize(toTableVec3Column);
		expect(v3.x).toBe(1);
		expect(v3.y).toBe(2);
		expect(v3.z).toBe(3);

		ent.deserialize(fromTableEntityColumn);
		expect(ent.id).toBe(1n);
		fromTableVec3Column.offset = 0;
		v3.deserialize(fromTableVec3Column);
		expect(v3.x).toBe(7);
		expect(v3.y).toBe(8);
		expect(v3.z).toBe(9);
	});

	it('deletes elements, swaps in last elements', async () => {
		const table = createTable(Entity, Vec3);

		table.resize(8);
		table.add(1n);
		table.add(2n);
		table.add(3n);
		table.add(4n);
		expect(table.length).toBe(4);

		const entityColumn = table.getColumn(Entity);
		entityColumn.offset = 0;
		const vecColumn = table.getColumn(Vec3);
		vecColumn.offset = 0;
		const vec = new Vec3();
		const ent = new Entity();

		vec.deserialize(vecColumn);
		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vecColumn.offset -= Vec3.size;
		vec.serialize(vecColumn);
		vec.deserialize(vecColumn);
		vec.x = 4;
		vec.y = 5;
		vec.z = 6;
		vecColumn.offset -= Vec3.size;
		vec.serialize(vecColumn);
		vec.deserialize(vecColumn);
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;
		vecColumn.offset -= Vec3.size;
		vec.serialize(vecColumn);
		vec.deserialize(vecColumn);
		vec.x = 10;
		vec.y = 11;
		vec.z = 12;
		vecColumn.offset -= Vec3.size;
		vec.serialize(vecColumn);

		table.delete(1);
		expect(table.length).toBe(3);

		vecColumn.offset = 0;
		entityColumn.offset = 0;
		vec.deserialize(vecColumn);
		ent.deserialize(entityColumn);
		expect(ent.id).toBe(1n);
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);
		vec.deserialize(vecColumn);
		ent.deserialize(entityColumn);
		expect(ent.id).toBe(4n);
		expect(vec.x).toBe(10);
		expect(vec.y).toBe(11);
		expect(vec.z).toBe(12);
		vec.deserialize(vecColumn);
		ent.deserialize(entityColumn);
		expect(ent.id).toBe(3n);
		expect(vec.x).toBe(7);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(9);
	});

	it('move() returns the last entity', async () => {
		const table = createTable(Entity);
		const empty = Table.createEmpty();
		expect(table.length).toBe(0);
		expect(table.capacity).toBe(0);
		table.resize(8);

		const id1 = 4n;
		const id2 = (1n << 32n) | 5n;
		table.add(id1);
		table.add(id2);

		expect(table.move(0, empty)).toBe(id2);
		expect(table.move(0, empty)).toBe(id2);
	});

	// v0.6 changelog bugfix
	it('backfills elements for ALL stores', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity);
		const ent = new Entity();

		fromTable.resize(8);
		toTable.resize(8);
		fromTable.add(3n);
		fromTable.add(1n);
		toTable.add(4n);

		const fromTableEntityColumn = fromTable.getColumn(Entity);
		const fromTableVec3Column = fromTable.getColumn(Vec3);

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);
		fromTableEntityColumn.offset = 0;
		ent.deserialize(fromTableEntityColumn);
		expect(ent.id).toBe(3n);

		const v3 = new Vec3();
		v3.deserialize(fromTableVec3Column);
		fromTableVec3Column.offset -= Vec3.size;
		v3.x = 1;
		v3.y = 2;
		v3.z = 3;
		v3.serialize(fromTableVec3Column);
		v3.deserialize(fromTableVec3Column);
		fromTableVec3Column.offset -= Vec3.size;
		v3.x = 7;
		v3.y = 8;
		v3.z = 9;
		v3.serialize(fromTableVec3Column);

		fromTable.move(0, toTable);

		const toTableEntityColumn = toTable.getColumn(Entity);
		toTableEntityColumn.offset = Entity.size;
		ent.deserialize(toTableEntityColumn);
		expect(ent.id).toBe(3n);

		fromTableVec3Column.offset = 0;
		fromTableEntityColumn.offset = 0;
		v3.deserialize(fromTableVec3Column);
		ent.deserialize(fromTableEntityColumn);
		expect(ent.id).toBe(1n);
		expect(v3.x).toBe(7);
		expect(v3.y).toBe(8);
		expect(v3.z).toBe(9);
	});

	// v0.6 changelog bugfix
	it('does not create columns for ZSTs', async () => {
		class ZST {
			static size = 0;
			static alignment = 1;
		}
		const table = createTable(Entity, Vec3, ZST);
		expect(table.hasColumn(ZST)).toBe(false);
	});
}
