import type { Struct } from '../struct';
import type { Table } from '../storage';
import type { Commands } from '../world/Commands';
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
	#elementOffset = 0;
	#elements: object[];

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
		commands: Commands,
	) {
		this.#with = withFilters;
		this.#isIndividual = isIndividual;
		this.#without = withoutFilters;
		this.#components = components;
		this.#commands = commands;
		this.#elements = this.#components.map(
			// TODO: This will cause a de-opt - refactor to not pass an empty object
			Component => new Component({} as any, 0, commands),
		);
	}

	get size() {
		return this.#tables.reduce((acc, val) => acc + val.size, 0);
	}

	*[Symbol.iterator](): QueryIterator<A> {
		if (this.#elementOffset >= this.#elements.length) {
			this.#elements.push(
				...this.#components.map(
					Component => new Component({} as any, 0, this.#commands),
				),
			);
		}

		const elements: Array<object | null> = this.#elements.slice(
			this.#elementOffset,
			this.#elementOffset + this.#components.length,
		);
		const offset = this.#elementOffset;
		this.#elementOffset += this.#components.length;

		for (const table of this.#tables) {
			elements.forEach((_, i) => {
				const element = this.#elements[i + offset];
				const store = table.columns.get(element.constructor as any);
				if (!store) {
					elements[i] = null;
				} else {
					elements[i] = element;
					//@ts-ignore
					elements[i].__$$s = store;
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
	const { UncreatedEntitiesTable } = await import(
		'../storage/UncreatedEntitiesTable'
	);

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
					return 16;
				},
			},
		};
		const createTable = (...components: Struct[]) =>
			Table.create(
				{ ...mockWorld, tableLengths: new Uint32Array(1) },
				components,
				0n,
				0,
			);
		const uncreated = new UncreatedEntitiesTable(mockWorld);

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
			const table1 = createTable(Entity, Vec3);
			const table2 = createTable(Entity, Vec3);
			query.testAdd(0n, table1);
			query.testAdd(0n, table2);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				uncreated.move(i, i < 5 ? table1 : table2);
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
			const vecTable = createTable(Entity, Vec3);
			const noVecTable = createTable(Entity);

			query.testAdd(0n, noVecTable);
			query.testAdd(0n, vecTable);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				uncreated.move(i, i < 5 ? noVecTable : vecTable);
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
			const table = createTable(Entity, Vec3);

			query.testAdd(0n, table);
			expect(query.size).toBe(0);
			for (let i = 0; i < 10; i++) {
				uncreated.move(i, table);
				expect(query.size).toBe(i + 1);
			}
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields unique elements for nested iteration', () => {
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				{} as any,
			);
			const table = createTable(Entity, Vec3);

			query.testAdd(0n, table);
			expect(query.size).toBe(0);
			for (let i = 0; i < 8; i++) {
				uncreated.move(i, table);
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
