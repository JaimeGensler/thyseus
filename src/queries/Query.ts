import { memory } from '../utils/memory';
import { dropStruct } from '../storage/initStruct';
import { Entity, Table } from '../storage';
import type { Struct } from '../struct';
import type { World } from '../world';
import type { Commands } from '../commands';
import type { Mut, Optional, Filter } from './modifiers';

type Accessors = object | object[];
type QueryIteration<A extends Accessors> = A extends any[]
	? {
			[Index in keyof A]: IteratorItem<A[Index]>;
	  }
	: IteratorItem<A>;
type IteratorItem<I> = I extends Optional<infer X>
	? X extends Mut<infer Y>
		? Y | null
		: Readonly<X> | null
	: I extends Mut<infer X>
	? X
	: Readonly<I>;
type Element = { __$$b: number; constructor: Struct };

export class Query<A extends Accessors, F extends Filter = []> {
	#tables: Table[] = [];
	#elements: Element[][] = [];

	#with: bigint[];
	#without: bigint[];
	#components: Struct[];
	#isIndividual: boolean;
	#commands: Commands;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		world: World,
	) {
		this.#with = withFilters;
		this.#without = withoutFilters;
		this.#isIndividual = isIndividual;
		this.#components = components;
		this.#commands = world.commands;
	}

	/**
	 * The number of entities that match this query.
	 */
	get length(): number {
		return this.#tables.reduce((acc, val) => acc + val.size, 0);
	}

	*[Symbol.iterator](): Iterator<QueryIteration<A>> {
		let holds: (Element | null)[];
		const elements = this.#getIteration();

		for (const table of this.#tables) {
			if (table.size === 0) {
				continue;
			}
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i] ?? holds![i]!;
				const hasColumn = table.hasColumn(element.constructor);
				if (!hasColumn && elements[i] !== null) {
					holds ??= [];
					holds[i] = elements[i];
					elements[i] = null;
				} else if (hasColumn) {
					if (elements[i] === null) {
						elements[i] = holds![i];
						holds![i] = null;
					}
					element.__$$b = table.getColumn(element.constructor);
				}
			}

			for (let i = 0; i < table.size; i++) {
				yield (this.#isIndividual ? elements[0] : elements) as any;

				for (const element of elements) {
					if (element) {
						element.__$$b += element.constructor.size!;
					}
				}
			}
		}
		if (holds!) {
			for (let i = 0; i < holds.length; i++) {
				if (holds[i]) {
					elements[i] = holds[i];
				}
			}
		}
		this.#elements.push(elements as Element[]);
	}

	/**
	 * If this query matches **exactly** one element, returns the queried component(s).
	 * Otherwise, throws an error.
	 */
	single(): QueryIteration<A> {
		if (this.length !== 1) {
			throw new Error(
				'Tried Query.single() on a query that had multiple matches',
			);
		}

		// TODO
		return [] as any;
	}

	forEach(
		callback: (
			...components: A extends any[]
				? QueryIteration<A>
				: [QueryIteration<A>]
		) => void,
	): void {
		if (this.#isIndividual) {
			for (const element of this) {
				(callback as any)(element);
			}
		} else {
			for (const elements of this) {
				callback(...(elements as any));
			}
		}
	}

	#getIteration(): (Element | null)[] {
		return (
			this.#elements.pop() ??
			(this.#components.map(comp => {
				const instance =
					comp === Entity
						? new (comp as any)(this.#commands)
						: (new comp() as any);
				dropStruct(instance);
				return instance;
			}) as any)
		);
	}

	testAdd(tableId: bigint, table: Table): void {
		if (this.#test(tableId)) {
			this.#tables.push(table);
		}
	}
	#test(n: bigint) {
		for (let i = 0; i < this.#with.length; i++) {
			if (
				(this.#with[i] & n) === this.#with[i] &&
				(this.#without[i] & n) === 0n
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
	const { initStruct, Entity, Table } = await import('../storage');
	const { World } = await import('../world');
	const { ThreadGroup } = await import('../threads/ThreadGroup');
	ThreadGroup.isMainThread = true;

	const createWorld = (...components: Struct[]) =>
		components
			.reduce((acc, comp) => acc.registerComponent(comp), World.new())
			.build();

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	const spawnIntoTable = (eid: number, targetTable: Table) => {
		if (targetTable.capacity === targetTable.size) {
			targetTable.grow();
		}
		memory.views.u64[
			(targetTable.getColumn(Entity) + targetTable.size * 8) >> 3
		] = BigInt(eid);
		targetTable.size++;
	};

	it('testAdd adds tables only if a filter passes', async () => {
		const world = await createWorld();
		const query1 = new Query([0b0001n], [0b0000n], false, [], world);
		const table: Table = { size: 1 } as any;
		expect(query1.length).toBe(0);
		query1.testAdd(0b0001n, table);
		expect(query1.length).toBe(1);
		query1.testAdd(0b0010n, table);
		expect(query1.length).toBe(1);

		const query2 = new Query([0b0100n], [0b1011n], false, [], world);
		expect(query2.length).toBe(0);
		query2.testAdd(0b0110n, table);
		expect(query2.length).toBe(0);
		query2.testAdd(0b0100n, table);
		expect(query2.length).toBe(1);

		const query3 = new Query(
			[0b0001n, 0b0010n, 0b0100n],
			[0b1000n, 0b0100n, 0b0010n],
			false,
			[],
			world,
		);
		expect(query3.length).toBe(0);
		query3.testAdd(0b0001n, table); // Passes 1
		expect(query3.length).toBe(1);
		query3.testAdd(0b0010n, table); // Passes 2
		expect(query3.length).toBe(2);
		query3.testAdd(0b0100n, table); // Passes 3
		expect(query3.length).toBe(3);
		query3.testAdd(0b0110n, table); // Fails 1 With, 2/3 without
		expect(query3.length).toBe(3);
		query3.testAdd(0b1001n, table); // Fails 1 Without, 2/3 With
		expect(query3.length).toBe(3);
	});

	describe('iteration', () => {
		const createTable = (world: World, ...components: Struct[]) =>
			Table.create(world, components, 0n, 0);

		class Vec3 {
			static size = 24;
			constructor() {
				initStruct(this);
			}
		}
		class Entity2 extends Entity {}

		it('yields normal elements for all table members', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				world,
			);
			const table1 = createTable(world, Entity, Vec3);
			const table2 = createTable(world, Entity, Vec3);
			query.testAdd(0n, table1);
			query.testAdd(0n, table2);
			expect(query.length).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, i < 5 ? table1 : table2);
				expect(query.length).toBe(i + 1);
			}
			let j = 0;
			for (const [vec, ent] of query) {
				expect(vec).toBeInstanceOf(Vec3);
				expect(ent).toBeInstanceOf(Entity);
				expect(ent.id).toBe(BigInt(j));
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields null for optional members', async () => {
			const world = await createWorld(Vec3);
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				world,
			);
			const vecTable = createTable(world, Entity, Vec3);
			const noVecTable = createTable(world, Entity);

			query.testAdd(0n, noVecTable);
			query.testAdd(0n, vecTable);
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
			const query = new Query<Vec3>([0n], [0n], true, [Vec3], world);
			const table = createTable(world, Entity, Vec3);

			query.testAdd(0n, table);
			expect(query.length).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, table);
				expect(query.length).toBe(i + 1);
			}
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields unique elements for nested iteration', async () => {
			const world = await createWorld();
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				world,
			);
			const table = createTable(world, Entity, Vec3);

			query.testAdd(0n, table);
			expect(query.length).toBe(0);
			for (let i = 0; i < 8; i++) {
				spawnIntoTable(i, table);
				expect(query.length).toBe(i + 1);
			}

			let i = 0;
			for (const [vec1, ent1] of query) {
				let j = 0;
				for (const [vec2, ent2] of query) {
					expect(vec1).not.toBe(vec2);
					expect(ent1).not.toBe(ent2);
					expect(ent1.id).toBe(BigInt(i));
					expect(ent2.id).toBe(BigInt(j));
					j++;
				}
				i++;
			}
		});

		it('forEach works for tuples and individual elements', async () => {
			class Position extends Vec3 {}
			class Velocity extends Vec3 {}
			const world = await createWorld();
			const queryTuple = new Query<[Position, Velocity]>(
				[0n],
				[0n],
				false,
				[Position, Velocity],
				world,
			);
			const querySolo = new Query<Position>(
				[0n],
				[0n],
				true,
				[Position],
				world,
			);
			const table = createTable(world, Entity, Position, Velocity);

			queryTuple.testAdd(0n, table);
			querySolo.testAdd(0n, table);
			expect(queryTuple.length).toBe(0);
			expect(querySolo.length).toBe(0);
			for (let i = 0; i < 8; i++) {
				spawnIntoTable(i, table);
				expect(queryTuple.length).toBe(i + 1);
				expect(querySolo.length).toBe(i + 1);
			}

			let tupleIter = 0;
			queryTuple.forEach((pos, vel) => {
				expect(pos).toBeInstanceOf(Position);
				expect(vel).toBeInstanceOf(Velocity);
				tupleIter++;
			});
			let soloIter = 0;
			querySolo.forEach(pos => {
				expect(pos).toBeInstanceOf(Position);
				soloIter++;
			});
			expect(tupleIter).toBe(queryTuple.length);
			expect(soloIter).toBe(querySolo.length);
		});
	});
}
