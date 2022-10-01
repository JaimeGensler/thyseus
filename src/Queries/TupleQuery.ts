import type { ComponentType, ComponentStore } from '../Components';
import type { SparseSet } from '../utils/DataTypes';
import type Query from './Query';

export default class TupleQuery<C extends object[]> implements Query<C> {
	#elements: InstanceType<ComponentType>[];

	#components: ComponentType[];
	#stores: ComponentStore[];
	entities: SparseSet;
	#filter: bigint;
	constructor(
		components: ComponentType[],
		stores: ComponentStore[],
		entities: SparseSet,
		filter: bigint,
	) {
		this.entities = entities;
		this.#components = components;
		this.#stores = stores;
		this.#elements = this.#components.map(
			(Component, i) => new Component(this.#stores[i], 0),
		);
		this.#filter = filter;
	}

	*[Symbol.iterator](): Iterator<C> {
		for (const eid of this.entities) {
			for (const element of this.#elements) {
				//@ts-ignore
				element.eid = eid;
			}
			//@ts-ignore
			yield this.#elements;
		}
	}

	testAdd(i: number, n: bigint) {
		if (this.#test(n)) {
			this.entities.add(i);
		}
	}
	#test(n: bigint) {
		return (n & this.#filter) === this.#filter;
	}
}
