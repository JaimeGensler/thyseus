import type { Struct } from '../struct';
import type { Table } from '../storage';
import type { WorldCommands } from '../World/WorldCommands';
import type { Mut, Optional, Filter } from './modifiers';

type Accessors = object[];
type QueryIterator<A> = Iterator<{
	[Index in keyof A]: A[Index] extends Optional<infer X>
		? X extends Mut<infer Y>
			? Y | undefined
			: Readonly<X> | undefined
		: A[Index] extends Mut<infer X>
		? X
		: Readonly<A[Index]>;
}>;

export class Query<A extends Accessors, F extends Filter> {
	#elements: object[];
	#tables: Table[] = [];

	#with: bigint[];
	#without: bigint[];
	#components: Struct[];
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		components: Struct[],
		commands: WorldCommands,
	) {
		this.#with = withFilters;
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
		for (const table of this.#tables) {
			for (let i = 0; i < table.size; i++) {
				for (const element of this.#elements) {
					const store = table.columns.get(
						Object.getPrototypeOf(element).constructor,
					)!;
					//@ts-ignore
					element.__$$s = store;
					//@ts-ignore
					element.__$$i = i;
				}
				//@ts-ignore
				yield this.#elements;
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
	const { it, expect } = import.meta.vitest;

	it('testAdd adds tables only if a filter passes', () => {
		const query1 = new Query([0b0001n], [0b0000n], [], {} as any);
		const table: Table = { size: 1 } as any;
		expect(query1.size).toBe(0);
		query1.testAdd(0b0001n, table);
		expect(query1.size).toBe(1);
		query1.testAdd(0b0010n, table);
		expect(query1.size).toBe(1);

		const query2 = new Query([0b0100n], [0b1011n], [], {} as any);
		expect(query2.size).toBe(0);
		query2.testAdd(0b0110n, table);
		expect(query2.size).toBe(0);
		query2.testAdd(0b0100n, table);
		expect(query2.size).toBe(1);

		const query3 = new Query(
			[0b0001n, 0b0010n, 0b0100n],
			[0b1000n, 0b0100n, 0b0010n],
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
}
