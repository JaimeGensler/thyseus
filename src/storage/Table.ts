import { Memory } from '../utils';
import { Entity } from './Entity';
import type { Struct, StructInstance } from '../struct';

export class Table {
	static createEmpty(): Table {
		const table = new this([], 0n, 0);
		table.length = 2 ** 32 - 1;
		return table;
	}

	#components: Struct[];
	#pointer: number; // [length, capacity, ...columnPointers]
	archetype: bigint;
	#id: number;
	constructor(components: Struct[], archetype: bigint, id: number) {
		this.#components = components.filter(component => component.size! > 0);
		this.#pointer = Memory.alloc(4 * (2 + this.#components.length));
		this.archetype = archetype;
		this.#id = id;
	}

	get id(): number {
		return this.#id;
	}
	get capacity(): number {
		return Memory.u32[(this.#pointer >> 2) + 1];
	}
	get length(): number {
		return Memory.u32[this.#pointer >> 2];
	}
	set length(value: number) {
		Memory.u32[this.#pointer >> 2] = value;
	}

	hasColumn(componentType: Struct): boolean {
		return this.#components.includes(componentType);
	}

	add(entityId: bigint) {
		const ptr = this.#getColumn(Entity);
		Memory.u64[(ptr >> 3) + this.length] = entityId;
		this.length++;
	}

	delete(row: number): void {
		this.length--;
		let i = 8; // Start of pointers
		for (const component of this.#components) {
			const ptr = Memory.u32[(this.#pointer + i) >> 2];
			Memory.copy(
				ptr + this.length * component.size!, // From the last element
				component.size!, // Copy one component
				ptr + row * component.size!, // To this element
			);
			Memory.set(ptr + this.length * component.size!, component.size!, 0);
			i += 4;
		}
	}

	move(row: number, targetTable: Table): bigint {
		// We never call move for the empty table, so ptr will be defined.
		const ptr = this.#getColumn(Entity);
		// TODO: Update to just return row
		const lastEntity = Memory.u64[(ptr >> 3) + this.length - 1];
		for (const component of this.#components) {
			const componentSize = component.size!;
			const componentPointer =
				this.#getColumn(component) + row * componentSize;
			if (targetTable.hasColumn(component)) {
				Memory.copy(
					componentPointer,
					componentSize,
					targetTable.#getColumn(component) +
						targetTable.length * componentSize,
				);
			} else {
				component.drop?.(componentPointer);
			}
		}
		targetTable.length++;
		this.delete(row);
		return lastEntity;
	}

	grow(newCapacity: number): void {
		Memory.u32[(this.#pointer + 4) >> 2] = newCapacity;
		let i = 8;
		for (const component of this.#components) {
			Memory.reallocAt(
				this.#pointer + i,
				component.size! * this.capacity,
			);
			i += 4;
		}
	}

	copyDataIntoRow(
		row: number,
		componentType: Struct,
		copyFrom: number,
	): void {
		if (this.hasColumn(componentType)) {
			Memory.copy(
				copyFrom,
				componentType.size!,
				this.#getColumn(componentType) + row * componentType.size!,
			);
		}
	}
	copyComponentIntoRow(
		row: number,
		componentType: Struct,
		component: StructInstance,
	) {
		if (this.hasColumn(componentType)) {
			component.__$$b =
				this.#getColumn(componentType) + row * componentType.size!;
			component.serialize();
		}
	}

	getColumnPointer(componentType: Struct): number {
		const componentIndex = this.#components.indexOf(componentType);
		return componentIndex === -1
			? 0
			: this.#pointer + 8 + (componentIndex << 2);
	}
	getTableSizePointer(): number {
		return this.#pointer;
	}
	#getColumn(componentType: Struct): number {
		return Memory.u32[
			(this.#pointer >> 2) + 2 + this.#components.indexOf(componentType)
		];
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach, vi } = import.meta.vitest;
	const { World } = await import('../world');

	beforeEach(() => {
		Memory.init(10_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	class Vec3 {
		static size = 24;
		static alignment = 8;
		__$$b = 0;
		deserialize() {
			this.x = Memory.f64[this.__$$b >> 3];
			this.y = Memory.f64[(this.__$$b + 8) >> 3];
			this.z = Memory.f64[(this.__$$b + 16) >> 3];
		}
		serialize() {
			Memory.f64[this.__$$b >> 3] = this.x;
			Memory.f64[(this.__$$b + 8) >> 3] = this.y;
			Memory.f64[(this.__$$b + 16) >> 3] = this.z;
		}
		x: number = 0;
		y: number = 0;
		z: number = 0;
	}

	class StringComponent {
		static drop(offset: number) {
			Memory.free(Memory.u32[(offset + 8) >> 2]);
		}
		static size = 12;
		static alignment = 4;
		__$$b = 0;

		val: string = '';
	}

	const createWorld = () =>
		World.new({ isMainThread: true })
			.registerComponent(Vec3)
			.registerComponent(StringComponent)
			.build();
	const createTable = (...components: Struct[]) =>
		new Table(components, 0n, 0);
	const getColumn = (table: Table, column: Struct) =>
		Memory.u32[table.getColumnPointer(column) >> 2];
	const spawnIntoTable = (eid: number, targetTable: Table) => {
		if (targetTable.capacity === targetTable.length) {
			targetTable.grow(targetTable.capacity * 2 || 8);
		}
		const column = getColumn(targetTable, Entity);
		Memory.u64[(column + targetTable.length * 8) >> 3] = BigInt(eid);
		targetTable.length++;
	};

	it('add() adds an item', async () => {
		const table = createTable(Entity);
		expect(table.length).toBe(0);
		expect(table.capacity).toBe(0);
		table.grow(8);

		const id1 = 4n;
		const id2 = (1n << 32n) | 5n;
		table.add(id1);
		table.add(id2);

		const entity = new Entity();
		(entity as any).__$$b = getColumn(table, Entity);
		entity.deserialize();
		expect(entity.id).toBe(id1);
		(entity as any).__$$b += 8;
		entity.deserialize();
		expect(entity.id).toBe(id2);
	});

	it('adds an element', async () => {
		const table = createTable(Entity);
		expect(table.length).toBe(0);
		expect(table.capacity).toBe(0);

		spawnIntoTable(0, table);
		expect(table.length).toBe(1);
		expect(table.capacity).toBe(8);

		const entity = new Entity();
		(entity as any).__$$b = getColumn(table, Entity);
		entity.deserialize();
		expect(entity.id).toBe(0n);

		spawnIntoTable(3, table);
		entity.deserialize();
		expect(entity.id).toBe(0n);

		(entity as any).__$$b += Entity.size;
		entity.deserialize();
		expect(entity.id).toBe(3n);
		expect(table.length).toBe(2);
	});

	it('moves elements from one table to another', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity, Vec3);

		spawnIntoTable(3, fromTable);
		spawnIntoTable(1, fromTable);
		spawnIntoTable(4, toTable);

		const ent = new Entity();

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);
		(ent as any).__$$b = getColumn(fromTable, Entity);
		ent.deserialize();
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$b = getColumn(fromTable, Vec3);
		from.deserialize();
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.serialize();
		from.__$$b += Vec3.size;
		from.deserialize();
		from.x = 7;
		from.y = 8;
		from.z = 9;
		from.serialize();

		const to = new Vec3();
		to.__$$b = getColumn(toTable, Vec3)!;
		to.deserialize();
		expect(to.x).toBe(0);
		expect(to.y).toBe(0);
		expect(to.z).toBe(0);

		fromTable.move(0, toTable);

		expect(fromTable.length).toBe(1);
		expect(toTable.length).toBe(2);

		to.__$$b += Vec3.size;
		to.deserialize();
		expect(to.x).toBe(1);
		expect(to.y).toBe(2);
		expect(to.z).toBe(3);

		from.__$$b = getColumn(fromTable, Vec3);
		from.deserialize();
		ent.deserialize();
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
		expect(ent.id).toBe(1n);
	});

	it('deletes elements, swaps in last elements', async () => {
		const table = createTable(Entity, Vec3);

		spawnIntoTable(1, table);
		spawnIntoTable(2, table);
		spawnIntoTable(3, table);
		spawnIntoTable(4, table);
		expect(table.length).toBe(4);

		const entPtr = getColumn(table, Entity);
		const vecPtr = getColumn(table, Vec3);
		const vec = new Vec3();
		vec.__$$b = vecPtr;
		const ent = new Entity();
		(ent as any).__$$b = entPtr;

		vec.deserialize();
		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vec.serialize();
		vec.__$$b += Vec3.size;
		vec.deserialize();
		vec.x = 4;
		vec.y = 5;
		vec.z = 6;
		vec.serialize();
		vec.__$$b += Vec3.size;
		vec.deserialize();
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;
		vec.serialize();
		vec.__$$b += Vec3.size;
		vec.deserialize();
		vec.x = 10;
		vec.y = 11;
		vec.z = 12;
		vec.serialize();

		table.delete(1);
		expect(table.length).toBe(3);

		vec.__$$b = vecPtr;
		(ent as any).__$$b = entPtr;
		vec.deserialize();
		ent.deserialize();
		expect(ent.id).toBe(1n);
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);
		vec.__$$b += Vec3.size;
		(ent as any).__$$b += Entity.size;
		vec.deserialize();
		ent.deserialize();
		expect(ent.id).toBe(4n);
		expect(vec.x).toBe(10);
		expect(vec.y).toBe(11);
		expect(vec.z).toBe(12);
		vec.__$$b += Vec3.size;
		(ent as any).__$$b += Entity.size;
		vec.deserialize();
		ent.deserialize();
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
		table.grow(8);

		const id1 = 4n;
		const id2 = (1n << 32n) | 5n;
		table.add(id1);
		table.add(id2);

		expect(table.move(0, empty)).toBe(id2);
		expect(table.move(0, empty)).toBe(id2);
	});

	it('grows correctly', async () => {
		const table = createTable(Entity);

		spawnIntoTable(1, table);
		expect(table.length).toBe(1);
		expect(table.capacity).toBe(8);

		const entity = new Entity();
		(entity as any).__$$b = getColumn(table, Entity);
		entity.deserialize();
		expect(entity.id).toBe(1n);

		table.grow(table.capacity * 2 || 8);
		(entity as any).__$$b = getColumn(table, Entity);
		entity.deserialize();
		expect(table.capacity).toBe(16);
		expect(entity.id).toBe(1n);
	});

	// v0.6 changelog bugfix
	it('backfills elements for ALL stores', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity);
		const ent = new Entity();

		spawnIntoTable(3, fromTable);
		spawnIntoTable(1, fromTable);
		spawnIntoTable(4, toTable);

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);
		(ent as any).__$$b = getColumn(fromTable, Entity);
		ent.deserialize();
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$b = getColumn(fromTable, Vec3)!;
		from.deserialize();
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.serialize();
		from.__$$b += Vec3.size;
		from.deserialize();
		from.x = 7;
		from.y = 8;
		from.z = 9;
		from.serialize();

		fromTable.move(0, toTable);

		(ent as any).__$$b = getColumn(toTable, Entity)! + Entity.size!;
		ent.deserialize();
		expect(ent.id).toBe(3n);

		from.__$$b = getColumn(fromTable, Vec3);
		(ent as any).__$$b = getColumn(fromTable, Entity);
		from.deserialize();
		ent.deserialize();
		expect(ent.id).toBe(1n);
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
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

	it('move frees pointers if the target table does not have the pointer column', async () => {
		const freeSpy = vi.spyOn(Memory, 'free');
		const initialTable = createTable(Entity, StringComponent);
		const targetTable = createTable(Entity);

		spawnIntoTable(0, initialTable);

		const pointer = Memory.alloc(8);
		Memory.u32[(getColumn(initialTable, StringComponent) + 8) >> 2] =
			pointer;

		expect(freeSpy).not.toHaveBeenCalled();
		initialTable.move(0, targetTable);
		expect(freeSpy).toHaveBeenCalledOnce();
		expect(freeSpy).toHaveBeenCalledWith(pointer);
	});
}
