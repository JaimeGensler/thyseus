import { Memory } from '../utils';
import { Vec, type Table } from '../storage';
import type { Struct } from '../struct';
import type { World } from '../world';
import type { Mut } from './modifiers';
import type { Filter } from './filters';

export type Accessors = object | object[];
type QueryIteration<A extends Accessors> = A extends any[]
	? {
			[Index in keyof A]: IteratorItem<A[Index]>;
	  }
	: IteratorItem<A>;
type IteratorItem<I> = I extends Mut<infer X> ? X : Readonly<I>;
type Element = { __$$b: number; constructor: Struct };

export class Query<A extends Accessors, F extends Filter = Filter> {
	#elements: Element[][] = [];

	#vec: Vec;

	#filters: bigint[];
	#isIndividual: boolean;
	#components: Struct[];
	constructor(
		filters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		world: World,
	) {
		this.#filters = filters;
		this.#vec = new Vec(world.threads.queue(() => Memory.alloc(Vec.size)));
		this.#isIndividual = isIndividual;
		this.#components = components;
	}

	/**
	 * The number of entities that match this query.
	 */
	get length(): number {
		const { u32 } = Memory;
		const jump = this.#components.length + 1;
		let length = 0;
		for (let i = 0; i < this.#vec.length; i += jump) {
			length += u32[this.#vec.get(i) >> 2];
		}
		return length;
	}

	*[Symbol.iterator](): Iterator<QueryIteration<A>> {
		const { u32 } = Memory;
		const elements = this.#getIteration() as Element[];

		for (let cursor = 0; cursor < this.#vec.length; ) {
			const tableLength = u32[this.#vec.get(cursor++) >> 2];
			if (tableLength === 0) {
				cursor += this.#components.length;
				continue;
			}
			for (const element of elements) {
				element.__$$b = u32[this.#vec.get(cursor++) >> 2];
			}

			for (let j = 0; j < tableLength; j++) {
				yield (this.#isIndividual ? elements[0] : elements) as any;

				for (const element of elements) {
					element.__$$b += element.constructor.size!;
				}
			}
		}
		this.#elements.push(elements);
	}

	#getIteration(): (Element | null)[] {
		return (
			this.#elements.pop() ??
			(this.#components.map(comp => new comp()) as any)
		);
	}

	testAdd(table: Table): void {
		if (this.#test(table.archetype)) {
			if (this.#vec.length === this.#vec.capacity) {
				// Grow for 4 tables at a time
				this.#vec.grow(
					this.#vec.length + 4 * (this.#components.length + 1),
				);
			}
			this.#vec.push(table.getTableSizePointer());
			for (const component of this.#components) {
				this.#vec.push(table.getColumnPointer(component));
			}
		}
	}
	#test(n: bigint) {
		for (let i = 0; i < this.#filters.length; i += 2) {
			const withFilter = this.#filters[i];
			if (
				(withFilter & n) === withFilter &&
				(this.#filters[i + 1] & n) === 0n
			) {
				return true;
			}
		}
		return false;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, beforeEach } = import.meta.vitest;
	const { Entity, Table } = await import('../storage');
	const { World } = await import('../world');
	const { applyCommands } = await import('../commands');

	const createWorld = (...components: Struct[]) =>
		components
			.reduce(
				(acc, comp) => acc.registerComponent(comp),
				World.new({ isMainThread: true }),
			)
			.build();

	beforeEach(() => {
		Memory.init(24_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	class ZST {
		static size = 0;
		static alignment = 1;
		serialize() {}
		deserialize() {}
	}
	class Vec3 {
		static size = 24;
		static alignment = 8;
		serialize() {}
		deserialize() {}
	}
	class Entity2 extends Entity {}

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

	it('testAdd adds tables only if a filter passes', async () => {
		const world = await createWorld(ZST);
		const entity1 = world.entities.getId();
		world.entities.resetCursor();
		world.moveEntity(entity1, 0b0001n);
		const table = world.tables[1];

		const query1 = new Query([0b0001n, 0n], false, [], world);
		expect(query1.length).toBe(0);
		query1.testAdd(table);
		expect(query1.length).toBe(1);

		table.archetype = 0b0010n; // No longer matches
		query1.testAdd(table);
		expect(query1.length).toBe(1);

		const query2 = new Query([0b0100n, 0b1011n], false, [], world);
		expect(query2.length).toBe(0);
		table.archetype = 0b0110n;
		query2.testAdd(table);
		expect(query2.length).toBe(0);

		table.archetype = 0b0100n;
		query2.testAdd(table);
		expect(query2.length).toBe(1);

		const query3 = new Query(
			//prettier-ignore
			[0b0001n, 0b1000n, 
			 0b0010n, 0b0100n,
			 0b0100n, 0b0010n],
			false,
			[],
			world,
		);
		expect(query3.length).toBe(0);
		table.archetype = 0b0001n;
		query3.testAdd(table); // Passes 1
		expect(query3.length).toBe(1);
		table.archetype = 0b0010n;
		query3.testAdd(table); // Passes 2
		expect(query3.length).toBe(2);
		table.archetype = 0b0100n;
		query3.testAdd(table); // Passes 3
		expect(query3.length).toBe(3);
		table.archetype = 0b0110n;
		query3.testAdd(table); // Fails 1 With, 2/3 without
		expect(query3.length).toBe(3);
		table.archetype = 0b1001n;
		query3.testAdd(table); // Fails 1 Without, 2/3 With
		expect(query3.length).toBe(3);
	});

	describe('iteration', () => {
		const createTable = (...components: Struct[]) =>
			new Table(components, 0n, 0);

		it('yields normal elements for all table members', async () => {
			const world = await createWorld(Vec3, ZST);
			const query = new Query<[Vec3, Entity2]>(
				[0n, 0n],
				false,
				[Vec3, Entity],
				world,
			);
			world.queries.push(query);
			expect(query.length).toBe(0);

			for (let i = 0; i < 5; i++) {
				world.commands.spawn().addType(Vec3);
			}
			for (let i = 0; i < 5; i++) {
				world.commands.spawn().addType(Vec3).addType(ZST);
			}
			applyCommands(world);

			expect(query.length).toBe(10);
			let j = 0;
			for (const [vec, ent] of query) {
				ent.deserialize();
				expect(vec).toBeInstanceOf(Vec3);
				expect(ent).toBeInstanceOf(Entity);
				expect(ent.id).toBe(BigInt(j));
				j++;
			}
			expect(j).toBe(10);
		});

		it.skip('yields null for optional members', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<[Vec3, Entity2]>(
				[0n, 0n],
				false,
				[Vec3, Entity],
				world,
			);
			const vecTable = createTable(Entity, Vec3);
			const noVecTable = createTable(Entity);

			query.testAdd({ ...noVecTable, archetype: 0n } as any);
			query.testAdd({ ...vecTable, archetype: 0n } as any);
			expect(query.length).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, i < 5 ? noVecTable : vecTable);
				expect(query.length).toBe(i + 1);
			}
			let j = 0;
			for (const [vec, ent] of query) {
				if (j < 5) {
					expect(vec).toBeNull();
				} else {
					expect(vec).toBeInstanceOf(Vec3);
				}
				expect(ent).toBeInstanceOf(Entity);
				expect(ent.id).toBe(BigInt(j));
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields individual elements for non-tuple iterators', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<Vec3>([0n, 0n], true, [Vec3], world);

			for (let i = 0; i < 10; i++) {
				const id = world.entities.getId();
				world.entities.resetCursor();
				world.moveEntity(id, 0b11n);
			}
			const table = world.tables[1];
			table.archetype = 0n;
			expect(query.length).toBe(0);
			query.testAdd(table);
			expect(query.length).toBe(10);
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields unique elements for nested iteration', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<[Vec3, Entity2]>(
				[0n, 0n],
				false,
				[Vec3, Entity],
				world,
			);
			const id = world.entities.getId();
			world.entities.resetCursor();
			world.moveEntity(id, 0b11n);
			const table = world.tables[1];
			expect(query.length).toBe(0);

			table.archetype = 0n;
			query.testAdd(table);
			expect(query.length).toBe(1);
			for (let i = 1; i < 8; i++) {
				world.commands.spawn().addType(Vec3);
			}
			applyCommands(world);
			expect(query.length).toBe(8);

			let i = 0;
			for (const [vec1, ent1] of query) {
				ent1.deserialize();
				let j = 0;
				for (const [vec2, ent2] of query) {
					ent2.deserialize();
					expect(vec1).not.toBe(vec2);
					expect(ent1).not.toBe(ent2);
					expect(ent1.id).toBe(BigInt(i));
					expect(ent2.id).toBe(BigInt(j));
					j++;
				}
				i++;
			}
		});

		it('works if early table is empty and later table is not', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<any>([0n, 0n], true, [Entity], world);

			// Move one entity into an `Entity` table, and then move it out.
			// Query will match that table, but it will be empty.
			const id = world.entities.getId();
			world.entities.resetCursor();
			world.moveEntity(id, 0b01n);

			world.moveEntity(id, 0b11n);

			for (let i = 0; i < 9; i++) {
				const id = world.entities.getId();
				world.entities.resetCursor();
				world.moveEntity(id, 0b11n);
			}

			const table1 = world.tables[1];
			query.testAdd(table1);
			expect(table1.length).toBe(0);
			expect(query.length).toBe(0);

			const table2 = world.tables[2];
			query.testAdd(table2);
			expect(table2.length).toBe(10);
			expect(query.length).toBe(10);

			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Entity);
				j++;
			}
			expect(j).toBe(10);
		});
	});
}
