import type { Class } from '../components';
import type { World } from '../world';

import { createArchetypeFilter, type Filter } from './filters';

/**
 * A collection that matches against entities that have a set of components and match a particular filter.
 */
export class Query<A extends object | object[], F extends Filter = Filter> {
	static async intoArgument(
		world: World,
		accessors: Class | Class[],
		filter?: Filter,
	) {
		const isIndividual = !Array.isArray(accessors);
		const components: Class[] = isIndividual ? [accessors] : accessors;
		const initial = world.getArchetype(...components);
		const filters = filter
			? createArchetypeFilter(filter, [initial, 0n], (...components) =>
					world.getArchetype(...components),
			  )
			: [initial, 0n];
		return new Query(world, filters, isIndividual, components);
	}

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
		world.addEventListener('createTable', table => {
			if (this.#test(table.archetype)) {
				for (const component of this.#components) {
					this.#columns.push(table.getColumn(component));
				}
			}
		});
		this.#filters = filters;
		this.#isIndividual = isIndividual;
		this.#components = components;
		this.#columns = [];
	}

	/**
	 * The number of entities that match this query.
	 */
	get length(): number {
		let result = 0;
		const jump = this.#components.length;
		for (let i = 0; i < this.#columns.length; i += jump) {
			result += this.#columns[i].length;
		}
		return result;
	}

	*[Symbol.iterator](): Iterator<A> {
		const elements = [];
		const componentCount = this.#components.length;
		for (
			let columnGroup = 0;
			columnGroup < this.#columns.length;
			columnGroup += componentCount
		) {
			const { length } = this.#columns[columnGroup];
			for (let iterations = 0; iterations < length; iterations++) {
				for (
					let columnOffset = 0;
					columnOffset < componentCount;
					columnOffset++
				) {
					elements[columnOffset] =
						this.#columns[columnGroup + columnOffset][iterations];
				}
				yield (this.#isIndividual ? elements[0] : elements) as any;
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
		const elements = [];
		const componentCount = this.#components.length;
		for (
			let columnGroup = 0;
			columnGroup < this.#columns.length;
			columnGroup += componentCount
		) {
			const { length } = this.#columns[columnGroup];
			for (let iterations = 0; iterations < length; iterations++) {
				for (
					let columnOffset = 0;
					columnOffset < componentCount;
					columnOffset++
				) {
					elements[columnOffset] =
						this.#columns[columnGroup + columnOffset][iterations];
				}
				initialValue = callback(
					initialValue,
					(this.#isIndividual ? elements[0] : elements) as any,
					index++,
				);
			}
		}
		return initialValue;
	}

	/**
	 * Tests if a given archetype matches this queries filters.
	 * @param n The archetype to test.
	 * @returns A boolean, `true` if the archetype matches and `false` if it does not.
	 */
	#test(n: bigint): boolean {
		for (let i = 0; i < this.#filters.length; i += 2) {
			const withFilter = this.#filters[i];
			const withoutFilter = this.#filters[i + 1];
			if ((withFilter & n) === withFilter && (withoutFilter & n) === 0n) {
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
	const { Entity } = await import('../entities');
	const { World } = await import('../world');
	const { applyCommands } = await import('../commands');
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

	it('adds tables if a filter passes', () => {
		const world = createWorld(ZST, Vec3);
		const query1 = new Query(world, [0b001n, 0b000n], false, [Entity]);
		const query2 = new Query(world, [0b100n, 0b010n], false, [Entity]);
		const query3 = new Query(
			world,
			[0b010n, 0b100n, 0b100n, 0b010n],
			false,
			[Entity],
		);

		expect(query1.length).toBe(0);
		expect(query2.length).toBe(0);
		expect(query3.length).toBe(0);

		world.commands.spawn(); // 1
		world.commands.spawn().add(new Vec3()); // 1, 2, 3
		world.commands.spawn().addType(ZST); // 1, 3
		applyCommands(world);

		expect(query1.length).toBe(3); // Everything matches
		expect(query2.length).toBe(1);
		expect(query3.length).toBe(2);
	});

	describe('iteration', () => {
		it('yields normal elements for all table members', () => {
			const world = createWorld(Vec3, ZST);
			const query = new Query<[Vec3, Entity]>(world, [0n, 0n], false, [
				Vec3,
				Entity,
			]);
			expect(query.length).toBe(0);

			for (let i = 0; i < 5; i++) {
				world.commands.spawn().add(new Vec3());
			}
			for (let i = 0; i < 5; i++) {
				world.commands.spawn().add(new Vec3()).addType(ZST);
			}
			applyCommands(world);

			expect(query.length).toBe(10);
			let j = 0;
			for (const [vec, ent] of query) {
				expect(vec).toBeInstanceOf(Vec3);
				expect(ent).toBeInstanceOf(Entity);
				expect(ent.id).toBe(BigInt(j));
				j++;
			}
			expect(j).toBe(10);
		});

		it('yields individual elements for non-tuple iterators', () => {
			const world = createWorld(Vec3);
			const query = new Query<Vec3>(world, [0n, 0n], true, [Vec3]);

			expect(query.length).toBe(0);
			for (let i = 0; i < 10; i++) {
				world.commands.spawn().add(new Vec3());
			}
			applyCommands(world);

			expect(query.length).toBe(10);
			let j = 0;
			for (const vec of query) {
				expect(vec).toBeInstanceOf(Vec3);
				j++;
			}
			expect(j).toBe(10);
		});
	});
}
