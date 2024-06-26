import { Entity } from '../entities';
import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

import type { Filter } from './filters';
import { Maybe, type Accessor, type AccessorDescriptor } from './modifiers';

const EMPTY_COLUMN: [] = [];

/**
 * A collection that matches against entities that have a set of components and match a particular filter.
 */
export class Query<A extends Accessor | Accessor[], F extends Filter = Filter> {
	static intoArgument(
		world: World,
		accessors: AccessorDescriptor | AccessorDescriptor[],
		filter?: Filter,
	) {
		const isIndividual = !Array.isArray(accessors);
		accessors = Array.isArray(accessors) ? accessors : [accessors];
		const components = accessors.map(x => (Maybe.isMaybe(x) ? x.type : x));
		const initial = world.getArchetype(
			...accessors.filter((x): x is Class => !Maybe.isMaybe(x)),
		);
		const filters = filter ? filter.execute([initial, 0n]) : [initial, 0n];
		return new Query(world, filters, isIndividual, components);
	}

	#world: World;
	#columns: Array<object[]>;
	#filters: bigint[];
	#isIndividual: boolean;
	#components: Class[];
	constructor(
		world: World,
		filters: bigint[],
		isIndividual: boolean,
		components: Class[],
	) {
		this.#world = world;
		this.#filters = filters;
		this.#isIndividual = isIndividual;
		this.#components = components;
		this.#columns = [];
		this.#world.addEventListener('createTable', table => {
			if (this.#testArchetype(table.archetype)) {
				this.#columns.push(table.getColumn(Entity));
				for (const component of this.#components) {
					this.#columns.push(
						table.hasColumn(component)
							? table.getColumn(component)
							: EMPTY_COLUMN,
					);
				}
			}
		});
	}

	/**
	 * The number of entities that match this query.
	 */
	get length(): number {
		let result = 0;
		const span = this.#components.length + 1;
		for (let i = 0; i < this.#columns.length; i += span) {
			result += this.#columns[i].length;
		}
		return result;
	}

	*[Symbol.iterator](): IterableIterator<A> {
		const elements = [];
		const componentCount = this.#components.length;
		const groupSpan = componentCount + 1;
		for (
			let columnGroup = 0;
			columnGroup < this.#columns.length;
			columnGroup += groupSpan
		) {
			const { length } = this.#columns[columnGroup];
			for (let iterations = 0; iterations < length; iterations++) {
				for (let offset = 0; offset < componentCount; offset++) {
					elements[offset] =
						this.#columns[columnGroup + offset + 1][iterations];
				}
				yield (this.#isIndividual ? elements[0] : elements) as A;
			}
		}
	}

	/**
	 * Calls the provided callback function for all entities in the query.
	 * @param callback The callback to be called for all entities in this query.
	 */
	forEach(callback: (args: A, index: number) => void) {
		let index = 0;
		for (const result of this) {
			callback(result, index++);
		}
	}

	/**
	 * Calls the provided callback function for all the entities in the query.
	 * The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
	 * @param callback The callback to be called for every entity in the query.
	 * @param initialValue The initial value for the accumulated result.
	 * @returns The accumulated result.
	 */
	reduce<T>(
		callback: (acc: T, args: A, index: number) => T,
		initialValue: T,
	): T {
		let index = 0;
		for (const result of this) {
			initialValue = callback(initialValue, result, index++);
		}
		return initialValue;
	}

	/**
	 * Returns the queried components for the provided entity if it is alive and matched by this query.
	 * Otherwise, returns null.
	 * @param entity The entity
	 * @returns The queried-for components, or null if the entity no longer exists or does not match.
	 */
	get(entity: Entity): A | null {
		const [tableId, row] = entity.locate();
		const table = this.#world.tables[tableId];
		if (!this.#testArchetype(table.archetype)) {
			return null;
		}
		const result = [];
		for (const component of this.#components) {
			result.push(table.getColumn(component)[row]);
		}
		return (this.#isIndividual ? result[0] : result) as A;
	}

	/**
	 * Returns the first entity of this query.
	 *
	 * Queries using this method **should only have one match**;
	 * in dev, this method will throw if the query matches more than one entity.
	 * @returns The single matching entity.
	 */
	single(): A {
		DEV_ASSERT(
			this.length === 1,
			'Query.p.single was used for a query that matched multiple entities.',
		);
		const [result] = this;
		return result;
	}

	/**
	 * Iterates all _unique_ pairs in the query.
	 */
	*pairs(): IterableIterator<[A, A]> {
		const result: [A, A] = [null, null] as any;
		let i = 0;
		for (const iter1 of this) {
			let j = 0;
			for (const iter2 of this) {
				if (i <= j) {
					continue;
				}
				result[0] = iter1;
				result[1] = iter2;
				yield result;
				j++;
			}
			i++;
		}
	}

	/**
	 * Tests if a given archetype matches this queries filters.
	 * @param n The archetype to test.
	 * @returns A boolean, `true` if the archetype matches and `false` if it does not.
	 */
	#testArchetype(archetype: bigint): boolean {
		for (let i = 0; i < this.#filters.length; i += 2) {
			const withFilter = this.#filters[i];
			const withoutFilter = this.#filters[i + 1];
			if (
				(withFilter & archetype) === withFilter &&
				(withoutFilter & archetype) === 0n
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
	const { it, expect, describe } = import.meta.vitest;
	const { With, Without } = await import('./filters');
	const { Entity } = await import('../entities');
	const { World } = await import('../world');
	const { Tag } = await import('../components');

	const createWorld = (...components: Class[]) => {
		const world = new World();
		for (const component of components) {
			world.getComponentId(component);
		}
		return world;
	};

	class ZST extends Tag {}
	class Vec3 {}
	type Entity = InstanceType<typeof Entity>;

	describe('filtering', () => {
		it('matches tables for basic filters', () => {
			const world = createWorld(ZST, Vec3);
			const catchAllQuery = Query.intoArgument(world, Entity);
			const withVec = Query.intoArgument(world, [Vec3]);

			expect(catchAllQuery.length).toBe(0);
			expect(withVec.length).toBe(0);

			world.spawn(); // 1
			world.spawn().addType(ZST); // 1
			world.spawn().add(new Vec3()); // 1, 2, 3
			world.spawn().add(new Vec3()).addType(ZST); // 1, 3
			world.entities.update();

			expect(catchAllQuery.length).toBe(4);
			expect(withVec.length).toBe(2);
		});

		it('matches tables for Maybe<T>', () => {
			const world = createWorld(ZST, Vec3);
			const catchAllQuery = Query.intoArgument(world, Entity);
			const maybeQuery = Query.intoArgument(
				world,
				Maybe.intoArgument(world, Vec3),
			);

			expect(catchAllQuery.length).toBe(0);
			expect(maybeQuery.length).toBe(0);

			world.spawn(); // 1
			world.spawn().addType(ZST); // 1
			world.spawn().add(new Vec3()); // 1, 2, 3
			world.spawn().add(new Vec3()).addType(ZST); // 1, 3
			world.entities.update();

			expect(catchAllQuery.length).toBe(4);
			expect(maybeQuery.length).toBe(4);
		});

		it('matches tables for With<T>', () => {
			const world = createWorld(ZST, Vec3);
			const withZST = Query.intoArgument(
				world,
				Entity,
				new With(world, [ZST]),
			);
			const withVecAndZST = Query.intoArgument(
				world,
				Vec3,
				new With(world, [ZST]),
			);

			expect(withZST.length).toBe(0);
			expect(withVecAndZST.length).toBe(0);

			world.spawn(); // 1
			world.spawn().addType(ZST); // 1
			world.spawn().add(new Vec3()); // 1, 2, 3
			world.spawn().add(new Vec3()).addType(ZST); // 1, 3
			world.entities.update();

			expect(withZST.length).toBe(2);
			expect(withVecAndZST.length).toBe(1);
		});

		it('matches tables for Without<T>', () => {
			const world = createWorld(ZST, Vec3);
			const withoutZST = Query.intoArgument(
				world,
				Entity,
				new Without(world, [ZST]),
			);
			const withVecWithoutZST = Query.intoArgument(
				world,
				Vec3,
				new Without(world, [ZST]),
			);

			expect(withoutZST.length).toBe(0);
			expect(withVecWithoutZST.length).toBe(0);

			world.spawn(); // 1
			world.spawn().addType(ZST); // 1
			world.spawn().add(new Vec3()); // 1, 2, 3
			world.spawn().add(new Vec3()).addType(ZST); // 1, 3
			world.entities.update();

			expect(withoutZST.length).toBe(2);
			expect(withVecWithoutZST.length).toBe(1);
		});
	});

	describe('*[Symbol.iterator]', () => {
		it('yields normal elements for all table members', () => {
			const world = createWorld(Vec3, ZST);
			const query = new Query<[Vec3, Entity]>(world, [0n, 0n], false, [
				Vec3,
				Entity,
			]);
			expect(query.length).toBe(0);

			for (let i = 0; i < 5; i++) {
				world.spawn().add(new Vec3());
			}
			for (let i = 0; i < 5; i++) {
				world.spawn().add(new Vec3()).addType(ZST);
			}
			world.entities.update();

			expect(query.length).toBe(10);
			let j = 0;
			for (const [vec, ent] of query) {
				expect(vec).toBeInstanceOf(Vec3);
				expect(ent).toBeInstanceOf(Entity);
				expect(ent.id).toBe(j);
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields individual elements for non-tuple iterators', () => {
			const world = createWorld(Vec3);
			const query = new Query<Vec3>(world, [0n, 0n], true, [Vec3]);

			expect(query.length).toBe(0);
			for (let i = 0; i < 10; i++) {
				world.spawn().add(new Vec3());
			}
			world.entities.update();

			expect(query.length).toBe(10);
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields undefined for Maybe values', () => {
			const world = createWorld(Vec3);
			const query: Query<Vec3 | undefined> = Query.intoArgument(
				world,
				Maybe.intoArgument(world, Vec3),
			);

			expect(query.length).toBe(0);
			for (let i = 0; i < 5; i++) {
				world.spawn();
			}
			for (let i = 0; i < 5; i++) {
				world.spawn().add(new Vec3());
			}
			world.entities.update();

			expect(query.length).toBe(10);
			let undef = 0;
			let def = 0;
			for (const vec of query) {
				if (vec) {
					def++;
					expect(vec).toBeInstanceOf(Vec3);
				} else {
					undef++;
					expect(vec).toBeUndefined();
				}
			}
			expect(undef).toBe(5);
			expect(def).toBe(5);
		});
	});
}
