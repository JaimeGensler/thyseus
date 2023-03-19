import { memory } from '../utils/memory';
import { dropStruct } from '../storage/initStruct';
import { Entity, type Table, type Entities } from '../storage';
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
	#elements: Element[][] = [];

	#pointer: number;

	#with: bigint[];
	#without: bigint[];
	#components: Struct[];
	#isIndividual: boolean;
	#commands: Commands;
	#entities: Entities;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		world: World,
	) {
		this.#pointer = world.threads.queue(() => memory.alloc(12));
		this.#with = withFilters;
		this.#without = withoutFilters;
		this.#isIndividual = isIndividual;
		this.#components = components;
		this.#commands = world.commands;
		this.#entities = world.entities;
	}

	/**
	 * The number of entities that match this query.
	 */
	get length(): number {
		const { u32 } = memory.views;
		const tableCount = u32[this.#pointer >> 2];
		const jump = this.#components.length + 1;
		let length = 0;
		let cursor = u32[(this.#pointer + 8) >> 2] >> 2;
		for (let i = 0; i < tableCount; i++) {
			length += u32[u32[cursor] >> 2];
			cursor += jump;
		}
		return length;
	}

	get #size() {
		return memory.views.u32[this.#pointer >> 2];
	}
	set #size(val: number) {
		memory.views.u32[this.#pointer >> 2] = val;
	}
	get #capacity() {
		return memory.views.u32[(this.#pointer + 4) >> 2];
	}
	set #capacity(val: number) {
		memory.views.u32[(this.#pointer + 4) >> 2] = val;
	}

	*[Symbol.iterator](): Iterator<QueryIteration<A>> {
		const { u32 } = memory.views;
		const elements = this.#getIteration() as Element[];

		const tableCount = u32[this.#pointer >> 2];

		let cursor = u32[(this.#pointer + 8) >> 2] >> 2;
		for (let i = 0; i < tableCount; i++) {
			const tableLength = u32[u32[cursor] >> 2];
			cursor++;
			if (tableLength === 0) {
				continue;
			}
			for (const element of elements) {
				element.__$$b = u32[u32[cursor] >> 2];
				cursor++;
			}

			for (let j = 0; j < tableLength; j++) {
				yield (this.#isIndividual ? elements[0] : elements) as any;

				for (const element of elements) {
					if (element) {
						element.__$$b += element.constructor.size!;
					}
				}
			}
		}
		this.#elements.push(elements);
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
						? new (comp as any)(this.#commands, this.#entities)
						: (new comp() as any);
				dropStruct(instance);
				return instance;
			}) as any)
		);
	}

	testAdd(table: Table): void {
		const { u32 } = memory.views;
		if (this.#test(table.bitfield)) {
			if (this.#size === this.#capacity) {
				// Grow for 8 tables at a time
				const additionalSize = 8 * (this.#components.length + 1);
				memory.reallocAt(
					this.#pointer + 8,
					(this.#size + additionalSize) * 4,
				);
				this.#capacity += 8;
			}
			let cursor =
				(u32[(this.#pointer + 8) >> 2] >> 2) +
				this.#size * (this.#components.length + 1);
			this.#size++;
			u32[cursor] = table.getTableSizePointer();
			for (const component of this.#components) {
				cursor++;
				u32[cursor] = table.getColumnPointer(component);
			}
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
	const { applyCommands } = await import('../commands');

	const createWorld = (...components: Struct[]) =>
		components
			.reduce(
				(acc, comp) => acc.registerComponent(comp),
				World.new({ isMainThread: true }),
			)
			.build();

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	const spawnIntoTable = (eid: number, targetTable: Table) => {
		if (targetTable.capacity === targetTable.length) {
			targetTable.grow();
		}
		memory.views.u64[
			(targetTable.getColumn(Entity) + targetTable.length * 8) >> 3
		] = BigInt(eid);
		targetTable.length++;
	};

	it('testAdd adds tables only if a filter passes', async () => {
		class ZST {
			static size = 0;
		}
		const world = await createWorld(ZST);
		const entity1 = world.entities.spawn();
		world.moveEntity(entity1, 0b0001n);
		const table = world.archetypes[2];
		const query1 = new Query([0b0001n], [0b0000n], false, [], world);
		expect(query1.length).toBe(0);
		query1.testAdd(table);
		expect(query1.length).toBe(1);

		table.bitfield = 0b0010n; // No longer matches
		query1.testAdd(table);
		expect(query1.length).toBe(1);

		const query2 = new Query([0b0100n], [0b1011n], false, [], world);
		expect(query2.length).toBe(0);
		table.bitfield = 0b0110n;
		query2.testAdd(table);
		expect(query2.length).toBe(0);

		table.bitfield = 0b0100n;
		query2.testAdd(table);
		expect(query2.length).toBe(1);

		const query3 = new Query(
			[0b0001n, 0b0010n, 0b0100n],
			[0b1000n, 0b0100n, 0b0010n],
			false,
			[],
			world,
		);
		expect(query3.length).toBe(0);
		table.bitfield = 0b0001n;
		query3.testAdd(table); // Passes 1
		expect(query3.length).toBe(1);
		table.bitfield = 0b0010n;
		query3.testAdd(table); // Passes 2
		expect(query3.length).toBe(2);
		table.bitfield = 0b0100n;
		query3.testAdd(table); // Passes 3
		expect(query3.length).toBe(3);
		table.bitfield = 0b0110n;
		query3.testAdd(table); // Fails 1 With, 2/3 without
		expect(query3.length).toBe(3);
		table.bitfield = 0b1001n;
		query3.testAdd(table); // Fails 1 Without, 2/3 With
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
			class ZST {
				static size = 0;
			}
			const world = await createWorld(Vec3, ZST);
			const query = new Query<[Vec3, Entity2]>(
				[0n],
				[0n],
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
			applyCommands.fn(world, new Map());

			let j = 0;
			for (const [vec, ent] of query) {
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
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				world,
			);
			const vecTable = createTable(world, Entity, Vec3);
			const noVecTable = createTable(world, Entity);

			query.testAdd({ ...noVecTable, bitfield: 0n } as any);
			query.testAdd({ ...vecTable, bitfield: 0n } as any);
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
			for (let i = 0; i < 10; i++) {
				world.moveEntity(world.entities.spawn(), 0b11n);
			}
			const table = world.archetypes[2];
			table.bitfield = 0n;
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
				[0n],
				[0n],
				false,
				[Vec3, Entity],
				world,
			);
			world.moveEntity(world.entities.spawn(), 0b11n);
			const table = world.archetypes[2];
			expect(query.length).toBe(0);

			table.bitfield = 0n;
			query.testAdd(table);
			expect(query.length).toBe(1);
			for (let i = 1; i < 8; i++) {
				world.commands.spawn().addType(Vec3);
			}
			applyCommands.fn(world, new Map());
			expect(query.length).toBe(8);

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
			const world = await createWorld(Position, Velocity);
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
			world.moveEntity(world.entities.spawn(), 0b111n);
			const table = world.archetypes[2];
			table.bitfield = 0n;

			expect(queryTuple.length).toBe(0);
			expect(querySolo.length).toBe(0);
			queryTuple.testAdd(table);
			querySolo.testAdd(table);
			expect(queryTuple.length).toBe(1);
			expect(querySolo.length).toBe(1);
			for (let i = 1; i < 8; i++) {
				world.moveEntity(world.entities.spawn(), 0b111n);
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
