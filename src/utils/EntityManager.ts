import type { ComponentType, ComponentStore } from '../Components/types';
import type { Query } from '../Queries';

export default class EntityManager {
	#nextId = 0;
	#unusedIds = [] as number[];
	#entityData = [] as bigint[];
	#dirtyEntities = new Set<number>();

	#stores: ComponentStore[];
	#components: ComponentType[];
	#queries: Query<any>[];
	constructor(
		stores: ComponentStore[],
		components: ComponentType[],
		queries: Query<any>[],
	) {
		this.#stores = stores;
		this.#components = components;
		this.#queries = queries;
	}

	private updateQueries() {
		for (const eid of this.#dirtyEntities) {
			for (const query of this.#queries) {
				//@ts-ignore
				query.testAdd(eid, this.#entityData[eid]);
			}
		}
		this.#dirtyEntities.clear();
	}

	spawn(...components: ComponentType<any>[]): number {
		const id = this.#unusedIds.pop() ?? this.#nextId++;
		this.#entityData[id] = 0n;
		this.insert(id, ...components);
		return id;
	}
	despawn(entity: number): void {
		this.#unusedIds.push(entity);
		this.#dirtyEntities.add(entity);
		this.#entityData[entity] = 0n;
	}

	insert(entity: number, ...components: ComponentType<any>[]): void {
		for (const component of components) {
			this.#dirtyEntities.add(entity);
			this.#entityData[entity] |=
				1n << BigInt(this.#components.indexOf(component as any));
		}
	}
	remove(entity: number, ...components: ComponentType[]): void {
		for (const component of components) {
			this.#dirtyEntities.add(entity);
			this.#entityData[entity] &= ~(
				1n << BigInt(this.#components.findIndex(component as any))
			);
		}
	}
}
