import type { ComponentType, Table } from '../Components';
import type { WorldCommands } from '../World/WorldCommands';
import type { Query } from './Query';

export class TupleQuery<C extends object[]> implements Query<C> {
	#elements: InstanceType<ComponentType>[];
	#tables: Table[] = [];

	#filter: bigint;
	#components: ComponentType[];
	constructor(
		filter: bigint,
		components: ComponentType[],
		commands: WorldCommands,
	) {
		this.#components = components;
		this.#filter = filter;
		this.#elements = this.#components.map(
			// NOTE: This will cause a de-opt - refactor to not pass an empty object
			Component => new Component({}, 0, commands),
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
