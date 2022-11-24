import type { Struct } from '../struct';
import type { Table } from '../storage';
import type { WorldCommands } from '../World/WorldCommands';
import type { Mut, Optional, Filter } from './modifiers';

type Accessors = object[];
export class Query<A extends Accessors, F extends Filter> {
	#elements: InstanceType<Struct>[];
	#tables: Table[] = [];

	#filter: bigint;
	#components: Struct[];
	constructor(filter: bigint, components: Struct[], commands: WorldCommands) {
		this.#components = components;
		this.#filter = filter;
		this.#elements = this.#components.map(
			// NOTE: This will cause a de-opt - refactor to not pass an empty object
			Component => new Component({} as any, 0, commands),
		);
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
		return (n & this.#filter) === this.#filter;
	}
}

type QueryIterator<A> = Iterator<{
	[Index in keyof A]: A[Index] extends Optional<infer X>
		? X extends Mut<infer Y>
			? Y | undefined
			: Readonly<X> | undefined
		: A[Index] extends Mut<infer X>
		? X
		: Readonly<A[Index]>;
}>;
