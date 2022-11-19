import type { Struct } from '../struct';
import type { Table } from '../storage';
import type { WorldCommands } from '../World/WorldCommands';

export class Query<C extends object[]> {
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

	*[Symbol.iterator](): Iterator<C> {
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
