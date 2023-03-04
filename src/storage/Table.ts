import { memory } from '../utils/memory';
import { Entity } from './Entity';
import type { World } from '../world';
import type { Struct } from '../struct';

export class Table {
	static createEmptyTable(world: World): Table {
		const pointer = world.threads.queue(() => {
			const capacity = 2 ** 32 - 1;
			const ptr = memory.alloc(8); // [length, capacity]
			memory.views.u32[ptr >> 2] = capacity;
			memory.views.u32[(ptr >> 2) + 1] = capacity;
			return ptr;
		});
		return new this(world, [], pointer, 0n, 0);
	}
	static createRecycledTable(world: World): Table {
		const pointer = world.threads.queue(() => {
			const capacity = world.config.getNewTableSize(0);
			const ptr = memory.alloc(8); // [length, capacity, Entity]
			memory.views.u32[ptr >> 2] = 0;
			memory.views.u32[(ptr >> 2) + 1] = capacity;
			memory.views.u32[(ptr >> 2) + 2] = memory.alloc(
				capacity * Entity.size,
			);
			return ptr;
		});
		return new this(world, [Entity], pointer, 0n, 1);
	}

	static create(
		world: World,
		components: Struct[],
		bitfield: bigint,
		id: number,
	): Table {
		const capacity = world.config.getNewTableSize(0);
		const sizedComponents = components.filter(
			component => component.size! > 0,
		);
		const pointer = memory.alloc(4 * (2 + sizedComponents.length));
		memory.views.u32[(pointer >> 2) + 1] = capacity;
		let i = 2;
		for (const component of sizedComponents) {
			memory.views.u32[(pointer >> 2) + i] = memory.alloc(
				component.size! * capacity,
			);
			i++;
		}
		return new this(world, sizedComponents, pointer, bitfield, id);
	}

	#world: World;
	#components: Struct[];
	#pointer: number; // [size, capacity, ...componentPointers]
	bitfield: bigint;
	#id: number;
	constructor(
		world: World,
		sizedComponents: Struct[],
		pointer: number,
		bitfield: bigint,
		id: number,
	) {
		this.#world = world;
		this.#components = sizedComponents;
		this.#pointer = pointer;
		this.bitfield = bitfield;
		this.#id = id;
	}

	get pointer() {
		return this.#pointer;
	}

	get id(): number {
		return this.#id;
	}
	get capacity(): number {
		return memory.views.u32[(this.#pointer >> 2) + 1];
	}

	get size(): number {
		return memory.views.u32[this.#pointer >> 2];
	}
	set size(value: number) {
		memory.views.u32[this.#pointer >> 2] = value;
	}

	getColumn(componentType: Struct): number {
		return memory.views.u32[
			(this.#pointer >> 2) + 2 + this.#components.indexOf(componentType)
		];
	}
	hasColumn(componentType: Struct): boolean {
		return this.#components.includes(componentType);
	}

	delete(index: number): void {
		this.size--;
		let i = 2; // Start of pointers
		for (const component of this.#components) {
			const ptr = memory.views.u32[(this.#pointer >> 2) + i];
			memory.copy(
				ptr + this.size * component.size!, // From the last element
				component.size!, // Copy one component
				ptr + index * component.size!, // To this element
			);
			i++;
		}
	}

	move(index: number, targetTable: Table): bigint {
		if (targetTable.capacity === targetTable.size) {
			targetTable.grow();
		}
		const { u32, u64 } = memory.views;
		if (this.#components[0] !== Entity) {
			targetTable.size++;
			return BigInt(index);
		}
		const ptr = this.getColumn(Entity);
		const lastEntity = u64[(ptr >> 3) + this.size];
		for (const component of this.#components) {
			const componentPointer =
				this.getColumn(component) + index * component.size!;
			if (targetTable.hasColumn(component)) {
				memory.copy(
					componentPointer,
					component.size!,
					targetTable.getColumn(component) +
						targetTable.size * component.size!,
				);
			} else {
				for (const pointerOffset of component.pointers ?? []) {
					memory.free(u32[(componentPointer + pointerOffset) >> 2]);
				}
			}
		}
		targetTable.size++;
		this.delete(index);
		return lastEntity;
	}

	grow(): void {
		memory.views.u32[(this.#pointer >> 2) + 1] =
			this.#world.config.getNewTableSize(this.capacity);
		let i = 2;
		for (const component of this.#components) {
			memory.views.u32[(this.#pointer >> 2) + i] = memory.realloc(
				memory.views.u32[(this.#pointer >> 2) + i],
				component.size! * this.capacity,
			);
			i++;
		}
	}

	copyComponentIntoRow(
		row: number,
		componentType: Struct,
		copyFrom: number,
	): void {
		if (this.hasColumn(componentType)) {
			memory.copy(
				copyFrom,
				componentType.size!,
				this.getColumn(componentType) + row * componentType.size!,
			);
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { struct } = await import('../struct');
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	@struct
	class Vec3 {
		declare static size: number;
		declare __$$b: number;
		@struct.f64 declare x: number;
		@struct.f64 declare y: number;
		@struct.f64 declare z: number;
		constructor() {}
	}

	@struct
	class StringComponent {
		declare static size: number;
		declare __$$b: number;
		@struct.string declare val: number;
		constructor() {}
	}

	const createWorld = () =>
		World.new()
			.registerComponent(Vec3)
			.registerComponent(StringComponent)
			.build();
	const createTable = (world: World, ...components: Struct[]) =>
		Table.create(world, components, 0n, 0);
	const spawnIntoTable = (eid: number, targetTable: Table) => {
		if (targetTable.capacity === targetTable.size) {
			targetTable.grow();
		}
		memory.views.u64[
			(targetTable.getColumn(Entity) + targetTable.size * 8) >> 3
		] = BigInt(eid);
		targetTable.size++;
	};

	it('adds an element', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity);
		expect(table.size).toBe(0);
		expect(table.capacity).toBe(8);
		spawnIntoTable(0, table);
		const entity = new Entity();
		(entity as any).__$$b = table.getColumn(Entity);
		expect(entity.id).toBe(0n);
		expect(table.size).toBe(1);
		spawnIntoTable(3, table);
		expect(entity.id).toBe(0n);
		(entity as any).__$$b += 8;
		expect(entity.id).toBe(3n);
		expect(table.size).toBe(2);
	});

	it('moves elements from one table to another', async () => {
		const world = await createWorld();
		const fromTable = createTable(world, Entity, Vec3);
		const toTable = createTable(world, Entity, Vec3);

		spawnIntoTable(3, fromTable);
		spawnIntoTable(1, fromTable);
		spawnIntoTable(4, toTable);

		const ent = new Entity();

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		(ent as any).__$$b = fromTable.getColumn(Entity);
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$b = fromTable.getColumn(Vec3);
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$b += Vec3.size;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		const to = new Vec3();
		to.__$$b = toTable.getColumn(Vec3)!;
		expect(to.x).toBe(0);
		expect(to.y).toBe(0);
		expect(to.z).toBe(0);

		fromTable.move(0, toTable);

		expect(fromTable.size).toBe(1);
		expect(toTable.size).toBe(2);

		to.__$$b += Vec3.size;
		expect(to.x).toBe(1);
		expect(to.y).toBe(2);
		expect(to.z).toBe(3);

		from.__$$b = fromTable.getColumn(Vec3);
		expect(from.x).toBe(7);
		expect(from.y).toBe(8);
		expect(from.z).toBe(9);
		expect(ent.id).toBe(1n);
	});

	it('deletes elements, swaps in last elements', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity, Vec3);
		const entPtr = table.getColumn(Entity);
		const vecPtr = table.getColumn(Vec3);
		const vec = new Vec3();
		vec.__$$b = vecPtr;
		const ent = new Entity({} as any);
		(ent as any).__$$b = entPtr;

		spawnIntoTable(1, table);
		spawnIntoTable(2, table);
		spawnIntoTable(3, table);
		spawnIntoTable(4, table);
		expect(table.size).toBe(4);

		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		vec.__$$b += Vec3.size;
		vec.x = 4;
		vec.y = 5;
		vec.z = 6;
		vec.__$$b += Vec3.size;
		vec.x = 7;
		vec.y = 8;
		vec.z = 9;
		vec.__$$b += Vec3.size;
		vec.x = 10;
		vec.y = 11;
		vec.z = 12;

		table.delete(1);
		expect(table.size).toBe(3);

		vec.__$$b = vecPtr;
		(ent as any).__$$b = entPtr;
		expect(ent.id).toBe(1n);
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);
		vec.__$$b += Vec3.size;
		(ent as any).__$$b += Entity.size;
		expect(ent.id).toBe(4n);
		expect(vec.x).toBe(10);
		expect(vec.y).toBe(11);
		expect(vec.z).toBe(12);
		vec.__$$b += Vec3.size;
		(ent as any).__$$b += Entity.size;
		expect(ent.id).toBe(3n);
		expect(vec.x).toBe(7);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(9);
	});

	it('grows correctly', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity);

		const ent = new Entity();
		(ent as any).__$$b = table.getColumn(Entity);

		spawnIntoTable(1, table);

		expect(table.capacity).toBe(8);
		expect(table.size).toBe(1);
		expect(ent.id).toBe(1n);
		table.grow();
		(ent as any).__$$b = table.getColumn(Entity);
		expect(table.capacity).toBe(16);
		expect(ent.id).toBe(1n);
	});

	// v0.6 changelog bugfix
	it('backfills elements for ALL stores', async () => {
		const world = await createWorld();
		const fromTable = createTable(world, Entity, Vec3);
		const toTable = createTable(world, Entity);
		const ent = new Entity();

		spawnIntoTable(3, fromTable);
		spawnIntoTable(1, fromTable);
		spawnIntoTable(4, toTable);

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		(ent as any).__$$b = fromTable.getColumn(Entity);
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$b = fromTable.getColumn(Vec3)!;
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$b += Vec3.size;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		fromTable.move(0, toTable);

		(ent as any).__$$b = toTable.getColumn(Entity)! + Entity.size!;
		expect(ent.id).toBe(3n);

		from.__$$b = fromTable.getColumn(Vec3);
		(ent as any).__$$b = fromTable.getColumn(Entity);
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
		const world = await createWorld();
		const table = createTable(world, Entity, Vec3, ZST);
		expect(table.hasColumn(ZST)).toBe(false);
	});

	it('move frees pointers if the target table does not have the pointer column', async () => {
		const world = await createWorld();
		const freeSpy = vi.spyOn(memory, 'free');
		const initialTable = createTable(world, Entity, StringComponent);
		const targetTable = createTable(world, Entity);

		spawnIntoTable(0, initialTable);

		const pointer = memory.alloc(8);
		memory.views.u32[(initialTable.getColumn(StringComponent) + 8) >> 2] =
			pointer;

		expect(freeSpy).not.toHaveBeenCalled();
		initialTable.move(0, targetTable);
		expect(freeSpy).toHaveBeenCalledOnce();
		expect(freeSpy).toHaveBeenCalledWith(pointer);
	});
}
