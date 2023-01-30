import { Entity } from './Entity';
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
		const sizedComponents = components.filter(
			component => component.size! > 0,
		);
		const pointer = world.memory.alloc(4 * (2 + sizedComponents.length));
		world.memory.views.u32[(pointer >> 2) + 1] = capacity;
		let i = 2;
		for (const component of sizedComponents) {
			world.memory.views.u32[(pointer >> 2) + i] = world.memory.alloc(
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
		return this.#world.memory.views.u32[(this.#pointer >> 2) + 1];
	}
	set #capacity(val: number) {
		this.#world.memory.views.u32[(this.#pointer >> 2) + 1] = val;
	}
	get size(): number {
		return this.#world.memory.views.u32[this.#pointer >> 2];
	}
	set size(value: number) {
		this.#world.memory.views.u32[this.#pointer >> 2] = value;
	}

	getColumn(componentType: Struct): number {
		return this.#world.memory.views.u32[
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
			const ptr = this.#world.memory.views.u32[(this.#pointer >> 2) + i];
			this.#world.memory.copy(
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
		const ptr = this.getColumn(Entity);
		const lastEntity = this.#world.memory.views.u64[(ptr >> 3) + this.size];
		for (const component of this.#components) {
			if (targetTable.hasColumn(component)) {
				this.#world.memory.copy(
					this.getColumn(component) + index * component.size!,
					component.size!,
					targetTable.getColumn(component) +
						targetTable.size * component.size!,
				);
			}
		}
		targetTable.size++;
		this.delete(index);
		return lastEntity;
	}

	grow() {
		this.#capacity = this.#world.config.getNewTableSize(this.capacity);
		let i = 2;
		for (const component of this.#components) {
			this.#world.memory.views.u32[(this.#pointer >> 2) + i] =
				this.#world.memory.realloc(
					this.#world.memory.views.u32[(this.#pointer >> 2) + i],
					component.size! * this.capacity,
				);
			i++;
		}
	}

	incrementGeneration(row: number) {
		this.#world.memory.views.u32[
			(this.getColumn(Entity) >> 2) + (row << 1) + 1
		]++;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');
	const { struct } = await import('../struct');
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

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

	const createWorld = () => World.new().build();
	const createTable = (world: World, ...components: Struct[]) =>
		Table.create(world, components, 0n, 0);

	it('adds an element', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity);
		expect(table.size).toBe(0);
		expect(table.capacity).toBe(8);
		const uncreated = world.archetypes[0];
		uncreated.move(0, table);
		const entity = new Entity();
		(entity as any).__$$s = world.memory.views;
		(entity as any).__$$b = table.getColumn(Entity);
		expect(entity.id).toBe(0n);
		expect(table.size).toBe(1);
		uncreated.move(3, table);
		expect(entity.id).toBe(0n);
		(entity as any).__$$b += 8;
		expect(entity.id).toBe(3n);
		expect(table.size).toBe(2);
	});

	it('moves elements from one table to another', async () => {
		const world = await createWorld();
		const fromTable = createTable(world, Entity, Vec3);
		const toTable = createTable(world, Entity, Vec3);
		const uncreated = world.archetypes[0];

		uncreated.move(3, fromTable);
		uncreated.move(1, fromTable);
		uncreated.move(4, toTable);

		const ent = new Entity();
		(ent as any).__$$s = world.memory.views;

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		(ent as any).__$$b = fromTable.getColumn(Entity);
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$s = world.memory.views;
		from.__$$b = fromTable.getColumn(Vec3);
		from.x = 1;
		from.y = 2;
		from.z = 3;
		from.__$$b += Vec3.size;
		from.x = 7;
		from.y = 8;
		from.z = 9;

		const to = new Vec3();
		to.__$$s = world.memory.views;
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
		vec.__$$s = world.memory.views;
		vec.__$$b = vecPtr;
		const ent = new Entity({} as any);
		(ent as any).__$$s = world.memory.views;
		(ent as any).__$$b = entPtr;

		const uncreated = world.archetypes[0];

		uncreated.move(1, table);
		uncreated.move(2, table);
		uncreated.move(3, table);
		uncreated.move(4, table);
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
		const uncreated = world.archetypes[0];

		const ent = new Entity();
		(ent as any).__$$s = world.memory.views;
		(ent as any).__$$b = table.getColumn(Entity);

		uncreated.move(1, table);

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
		const uncreated = world.archetypes[0];
		const ent = new Entity();
		(ent as any).__$$s = world.memory.views;

		uncreated.move(3, fromTable);
		uncreated.move(1, fromTable);
		uncreated.move(4, toTable);

		expect(fromTable.size).toBe(2);
		expect(toTable.size).toBe(1);
		(ent as any).__$$b = fromTable.getColumn(Entity);
		expect(ent.id).toBe(3n);

		const from = new Vec3();
		from.__$$s = world.memory.views;
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
	// v0.10.0 applyCommands is responsible for overwriting stale data - test.
	it.skip('does not contain stale data when adding element', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity, Vec3);
		const uncreated = world.archetypes[0];

		uncreated.move(25, table);
		uncreated.move(233, table);

		const vec = new Vec3();
		vec.__$$s = world.memory.views;
		vec.__$$b = table.getColumn(Vec3);
		const ent = new Entity();
		(ent as any).__$$s = world.memory.views;
		(ent as any).__$$b = table.getColumn(Entity)!;
		vec.x = 100;
		vec.y = 200;
		vec.z = 300;
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		vec.__$$b += Vec3.size;
		vec.x = Math.PI;
		vec.y = Math.PI;
		vec.z = Math.PI;

		table.delete(1);
		uncreated.move(26, table);

		vec.__$$b = table.getColumn(Vec3);
		(ent as any).__$$b = table.getColumn(Entity);
		expect(vec.x).toBe(100);
		expect(vec.y).toBe(200);
		expect(vec.z).toBe(300);
		expect(ent.id).toBe(25n);

		vec.__$$b += Vec3.size;
		(ent as any).__$$b += Entity.size;
		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);
		expect(ent.id).toBe(26n);
	});

	// v0.6 changelog bugfix
	it('does not create columns for ZSTs', async () => {
		class ZST {
			static size = 0;
			static alignment = 1;
			static schema = 0;
		}
		const world = await createWorld();
		const table = createTable(world, Entity, Vec3, ZST);
		expect(table.hasColumn(ZST)).toBe(false);
	});

	it('increments generations', async () => {
		const world = await createWorld();
		const table = createTable(world, Entity);
		const ent = new Entity();
		(ent as any).__$$s = world.memory.views;
		(ent as any).__$$b = table.getColumn(Entity)!;
		expect(ent.generation).toBe(0);

		table.incrementGeneration(0);
		expect(ent.generation).toBe(1);

		table.incrementGeneration(0);
		expect(ent.generation).toBe(2);

		table.incrementGeneration(1);
		expect(ent.generation).toBe(2);
		expect(ent.id).toBe(0x00000002_00000000n);

		(ent as any).__$$b += Entity.size;
		expect(ent.generation).toBe(1);
		expect(ent.id).toBe(0x00000001_00000000n);

		(ent as any).__$$b += Entity.size;
		expect(ent.generation).toBe(0);
		expect(ent.id).toBe(0x00000000_00000000n);
	});
}
