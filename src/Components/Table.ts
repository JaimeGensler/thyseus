import createStore from './createStore';
import type { ComponentStore, ComponentType } from './types';

export default class Table {
	columns: Map<ComponentType, ComponentStore>;
	rowSize: number;
	size: number;
	capacity: number;

	static fromWorld(): Table {
		return new this([], 0, 0);
	}

	constructor(components: ComponentType[], size: number, capacity: number) {
		this.columns = components.reduce(
			(acc, component) =>
				acc.set(
					component,
					createStore(component, { threads: 1 } as any, 8),
				),
			new Map<ComponentType, ComponentStore>(),
		);
		this.rowSize = components.reduce(
			(acc, component) => acc + component.size,
			0,
		);
		this.size = size;
		this.capacity = capacity;
	}

	get isFull() {
		return this.capacity === this.size;
	}

	add(): void {}
	delete(index: number): void {}
	move(index: number, targetTable: Table): void {}

	grow(): this {
		for (const [, store] of this.columns) {
			// growStore(store);
		}
		return this;
	}
}

/*
- Grow table
	- Retain previous elements
- Delete element (destroy data)
- Move element (copy data to new table)
	- Move data, then delete
- Add element (no data to set)
*/

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	class ComponentA {
		static schema = { x: 0 };
		static size = 1;
	}

	it.skip('works', () => {
		console.log(new Table([ComponentA], 8, 8));
		expect(true).toBe(true);
	});
}
