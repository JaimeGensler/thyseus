import { memory, MemoryViews } from '../utils/memory';
import { Entity, type Table } from '../storage';
import type { Struct } from '../struct';
import type { World, Commands } from '../world';
import type { Mut, Optional, Filter } from './modifiers';

type Accessors = object | object[];
type QueryIterator<A extends Accessors> = Iterator<
	A extends any[]
		? {
				[Index in keyof A]: IteratorItem<A[Index]>;
		  }
		: IteratorItem<A>
>;
type IteratorItem<I> = I extends Optional<infer X>
	? X extends Mut<infer Y>
		? Y | null
		: Readonly<X> | null
	: I extends Mut<infer X>
	? X
	: Readonly<I>;
type Element = { __$$s: MemoryViews; __$$b: number };

export class Query<A extends Accessors, F extends Filter = []> {
	#tables = [] as Table[];
	#elementOffset = 0;
	#elements: Element[];

	#with: bigint[];
	#without: bigint[];
	#components: Struct[];
	#isIndividual: boolean;
	#commands: Commands;
	#views: MemoryViews;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		world: World,
	) {
		this.#with = withFilters;
		this.#isIndividual = isIndividual;
		this.#without = withoutFilters;
		this.#components = components;
		this.#commands = world.commands;
		this.#views = memory.views;
		this.#elements = this.#components.map(Component => {
			const result =
				Component === Entity
					? //@ts-ignore
					  (new Component(this.#commands) as Element)
					: (new Component() as Element);
			result.__$$s = this.#views;
			return result;
		});
	}

	get size(): number {
		return this.#tables.reduce((acc, val) => acc + val.size, 0);
	}

	*[Symbol.iterator](): QueryIterator<A> {
		if (this.#elementOffset >= this.#elements.length) {
			this.#elements.push(
				...this.#components.map(Component => {
					const result =
						Component === Entity
							? //@ts-ignore
							  (new Component(this.#commands) as Element)
							: (new Component() as Element);
					result.__$$s = this.#views;
					return result;
				}),
			);
		}

		const elements: Array<Element | null> = this.#elements.slice(
			this.#elementOffset,
			this.#elementOffset + this.#components.length,
		);
		const offset = this.#elementOffset;
		this.#elementOffset += this.#components.length;

		for (const table of this.#tables) {
			elements.forEach((_, i) => {
				const element = this.#elements[i + offset];
				if (!table.hasColumn(element.constructor as any)) {
					elements[i] = null;
				} else {
					elements[i] = element;
					elements[i]!.__$$b = table.getColumn(
						element.constructor as any,
					);
				}
			});

			for (let i = 0; i < table.size; i++) {
				if (this.#isIndividual) {
					yield elements[0] as any;
				} else {
					yield elements as any;
				}

				for (const element of elements) {
					if (element) {
						element.__$$b += (element.constructor as Struct).size!;
					}
				}
			}
		}
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
		expect(query1.size).toBe(0);
		query1.testAdd(0b0001n, table);
		expect(query1.size).toBe(1);
		query1.testAdd(0b0010n, table);
		expect(query1.size).toBe(1);

		const query2 = new Query([0b0100n], [0b1011n], false, [], world);
		expect(query2.size).toBe(0);
		query2.testAdd(0b0110n, table);
		expect(query2.size).toBe(0);
		query2.testAdd(0b0100n, table);
		expect(query2.size).toBe(1);

		const query3 = new Query(
			[0b0001n, 0b0010n, 0b0100n],
			[0b1000n, 0b0100n, 0b0010n],
			false,
			[],
			world,
		);
		expect(query3.size).toBe(0);
		query3.testAdd(0b0001n, table); // Passes 1
		expect(query3.size).toBe(1);
		query3.testAdd(0b0010n, table); // Passes 2
		expect(query3.size).toBe(2);
		query3.testAdd(0b0100n, table); // Passes 3
		expect(query3.size).toBe(3);
		query3.testAdd(0b0110n, table); // Fails 1 With, 2/3 without
		expect(query3.size).toBe(3);
		query3.testAdd(0b1001n, table); // Fails 1 Without, 2/3 With
		expect(query3.size).toBe(3);
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
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, i < 5 ? table1 : table2);
				expect(query.size).toBe(i + 1);
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
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, i < 5 ? noVecTable : vecTable);
				expect(query.size).toBe(i + 1);
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
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				spawnIntoTable(i, table);
				expect(query.size).toBe(i + 1);
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
			expect(query.size).toBe(0);
			for (let i = 0; i < 8; i++) {
				spawnIntoTable(i, table);
				expect(query.size).toBe(i + 1);
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
	});
}
