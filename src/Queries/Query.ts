import type { Struct } from '../struct';
import type { Table } from '../storage';
import type { WorldCommands } from '../World/WorldCommands';
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

export class Query<A extends Accessors, F extends Filter = []> {
	#tables = [] as Table[];
	#elements: object[];

	#with: bigint[];
	#without: bigint[];
	#components: Struct[];
	#isIndividual: boolean;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		commands: WorldCommands,
	) {
		this.#with = withFilters;
		this.#isIndividual = isIndividual;
		this.#without = withoutFilters;
		this.#components = components;
		this.#elements = this.#components.map(
			// NOTE: This will cause a de-opt - refactor to not pass an empty object
			Component => new Component({} as any, 0, commands),
		);
	}

	get size() {
		return this.#tables.reduce((acc, val) => acc + val.size, 0);
	}

	*[Symbol.iterator](): QueryIterator<A> {
		const elements: Array<object | null> = [...this.#elements];
		for (const table of this.#tables) {
			this.#elements.forEach((el, i) => {
				const store = table.columns.get(
					Object.getPrototypeOf(el).constructor,
				);
				if (!store) {
					elements[i] = null;
				} else {
					elements[i] = el;
					//@ts-ignore
					el.__$$s = store;
				}
			});

			for (let i = 0; i < table.size; i++) {
				for (const element of elements) {
					if (element) {
						//@ts-ignore
						element.__$$i = i;
					}
				}

				if (this.#isIndividual) {
					yield elements[0] as any;
				} else {
					yield elements as any;
				}
			}
		}
	}

	testAdd(tableId: bigint, table: Table) {
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
	const { it, expect, describe } = import.meta.vitest;
	const { Entity } = await import('../storage/Entity');
	const { Table } = await import('../storage/Table');

	it('testAdd adds tables only if a filter passes', () => {
		const query1 = new Query([0b0001n], [0b0000n], false, [], {} as any);
		const table: Table = { size: 1 } as any;
		expect(query1.size).toBe(0);
		query1.testAdd(0b0001n, table);
		expect(query1.size).toBe(1);
		query1.testAdd(0b0010n, table);
		expect(query1.size).toBe(1);

		const query2 = new Query([0b0100n], [0b1011n], false, [], {} as any);
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
			{} as any,
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
		const mockWorld: any = {
			createBuffer(size: number) {
				return new ArrayBuffer(size);
			},
			config: {
				getNewTableSize() {
					return 8;
				},
			},
		};
		class Vec3 {
			static size = 24;
		}
		class Entity2 extends Entity {}

		it('yields normal elements for all table members', () => {
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				{} as any,
			);
			const table1 = Table.create(mockWorld, [Entity, Vec3]);
			const table2 = Table.create(mockWorld, [Entity, Vec3]);
			query.testAdd(0n, table1);
			query.testAdd(0n, table2);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				(i < 5 ? table1 : table2).add(BigInt(i));
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

		it('yields null for optional members', () => {
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				{} as any,
			);
			const vecTable = Table.create(mockWorld, [Entity, Vec3]);
			const noVecTable = Table.create(mockWorld, [Entity]);

			query.testAdd(0n, noVecTable);
			query.testAdd(0n, vecTable);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				(i < 5 ? noVecTable : vecTable).add(BigInt(i));
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

		it('yields individual elements for non-tuple iterators', () => {
			const query = new Query<Vec3>([0n], [0n], true, [Vec3], {} as any);
			const table = Table.create(mockWorld, [Entity, Vec3]);

			query.testAdd(0n, table);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				table.add(BigInt(i));
				expect(query.size).toBe(i + 1);
			}
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);

				j++;
			}
			expect(j).toBe(10);
		});
	});
}
