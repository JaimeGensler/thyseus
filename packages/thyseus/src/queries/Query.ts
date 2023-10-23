import type { Class } from '../components';
import type { World } from '../world';

import type { Filter } from './filters';

export class Query<A extends object | object[], F extends Filter = Filter> {
	#elements: Array<object[]>;

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
		this.#elements = [];
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
		const elements = this.#getIteration();
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
		this.#elements.push(elements);
	}

	#getIteration(): object[] {
		return this.#elements.pop() ?? [];
	}

	#test(n: bigint) {
		for (let i = 0; i < this.#filters.length; i += 2) {
			const withFilter = this.#filters[i];
			if (
				(withFilter & n) === withFilter &&
				(this.#filters[i + 1] & n) === 0n
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
// if (import.meta.vitest) {
// 	const { it, expect, describe } = import.meta.vitest;
// 	const { Entity } = await import('../entities');
// 	const { World } = await import('../world');
// 	const { applyCommands } = await import('../commands');
// 	const { Tag } = await import('../components');

// 	const createWorld = async (...components: Class[]) => {
// 		const world = await World.new().build();
// 		for (const component of components) {
// 			world.getComponentId(component);
// 		}
// 		return world;
// 	};

// 	class ZST extends Tag {}
// 	class Vec3 {}
// 	type Entity = InstanceType<typeof Entity>;

// 	it.todo('adds tables only if a filter passes', async () => {
// 		const world = await createWorld();
// 		const query1 = new Query(world, [0b0001n, 0n], false, [Entity]);
// 		world.commands.spawn();
// 		applyCommands(world);
// 		const table = world.tables[1];

// 		expect(query1.length).toBe(0);
// 		query1.testAdd(table);
// 		expect(query1.length).toBe(1);

// 		table.archetype = 0b0010n; // No longer matches
// 		query1.testAdd(table);
// 		expect(query1.length).toBe(1);

// 		const query2 = new Query(world, [0b0100n, 0b1010n], false, [Entity]);
// 		expect(query2.length).toBe(0);
// 		table.archetype = 0b0110n;
// 		query2.testAdd(table);
// 		expect(query2.length).toBe(0);

// 		table.archetype = 0b0101n;
// 		query2.testAdd(table);
// 		expect(query2.length).toBe(1);

// 		const query3 = new Query(
// 			world,
// 			//prettier-ignore
// 			[0b0001n, 0b1000n,
// 			 0b0010n, 0b0100n,
// 			 0b0100n, 0b0010n],
// 			false,
// 			[Entity],
// 		);
// 		expect(query3.length).toBe(0);
// 		table.archetype = 0b0001n;
// 		query3.testAdd(table); // Passes 1
// 		expect(query3.length).toBe(1);
// 		table.archetype = 0b0010n;
// 		query3.testAdd(table); // Passes 2
// 		expect(query3.length).toBe(2);
// 		table.archetype = 0b0100n;
// 		query3.testAdd(table); // Passes 3
// 		expect(query3.length).toBe(3);
// 		table.archetype = 0b0110n;
// 		query3.testAdd(table); // Fails 1 With, 2/3 without
// 		expect(query3.length).toBe(3);
// 		table.archetype = 0b1001n;
// 		query3.testAdd(table); // Fails 1 Without, 2/3 With
// 		expect(query3.length).toBe(3);
// 	});

// 	describe('iteration', () => {
// 		it('yields normal elements for all table members', async () => {
// 			const world = await createWorld(Vec3, ZST);
// 			const query = new Query<[Vec3, Entity]>(world, [0n, 0n], false, [
// 				Vec3,
// 				Entity,
// 			]);
// 			expect(query.length).toBe(0);

// 			for (let i = 0; i < 5; i++) {
// 				world.commands.spawn().add(new Vec3());
// 			}
// 			for (let i = 0; i < 5; i++) {
// 				world.commands.spawn().add(new Vec3()).addType(ZST);
// 			}
// 			applyCommands(world);

// 			expect(query.length).toBe(10);
// 			let j = 0;
// 			for (const [vec, ent] of query) {
// 				expect(vec).toBeInstanceOf(Vec3);
// 				expect(ent).toBeInstanceOf(Entity);
// 				expect(ent.id).toBe(BigInt(j));
// 				j++;
// 			}
// 			expect(j).toBe(10);
// 		});

// 		it('yields individual elements for non-tuple iterators', async () => {
// 			const world = await createWorld(Vec3);
// 			const query = new Query<Vec3>(world, [0n, 0n], true, [Vec3]);

// 			for (let i = 0; i < 10; i++) {
// 				const ent = world.entities.get();
// 				world.moveEntity(ent, 0b11n);
// 			}
// 			const table = world.tables[1];
// 			table.archetype = 0n;
// 			expect(query.length).toBe(0);
// 			query.testAdd(table);
// 			expect(query.length).toBe(10);
// 			let j = 0;
// 			for (const vec of query) {
// 				expect(vec).toBeInstanceOf(Vec3);
// 				j++;
// 			}
// 			expect(j).toBe(10);
// 		});

// 		it.skip('yields unique elements for nested iteration', async () => {
// 			const world = await createWorld(Vec3);
// 			const query = new Query<[Vec3, Entity]>(world, [0n, 0n], false, [
// 				Vec3,
// 				Entity,
// 			]);
// 			const id = world.entities.getId();
// 			world.moveEntity(id, 0b11n);
// 			const table = world.tables[1];
// 			expect(query.length).toBe(0);

// 			table.archetype = 0n;
// 			query.testAdd(table);
// 			expect(query.length).toBe(1);
// 			for (let i = 1; i < 8; i++) {
// 				world.commands.spawn().add(new Vec3());
// 			}
// 			applyCommands(world);
// 			expect(query.length).toBe(8);

// 			let i = 0;
// 			for (const [vec1, ent1] of query) {
// 				let j = 0;
// 				for (const [vec2, ent2] of query) {
// 					expect(vec1).not.toBe(vec2);
// 					expect(ent1).not.toBe(ent2);
// 					expect(ent1.id).toBe(BigInt(i));
// 					expect(ent2.id).toBe(BigInt(j));
// 					j++;
// 				}
// 				i++;
// 			}
// 		});

// 		it('works if early table is empty and later table is not', async () => {
// 			const world = await createWorld(Vec3);
// 			const query = new Query<any>(world, [0n, 0n], true, [Entity]);

// 			// Move one entity into an `Entity` table, and then move it out.
// 			// Query will match that table, but it will be empty.
// 			const id = world.entities.getId();
// 			world.moveEntity(id, 0b01n);

// 			world.moveEntity(id, 0b11n);

// 			for (let i = 0; i < 9; i++) {
// 				const id = world.entities.getId();
// 				world.moveEntity(id, 0b11n);
// 			}

// 			const table1 = world.tables[1];
// 			query.testAdd(table1);
// 			expect(table1.length).toBe(0);
// 			expect(query.length).toBe(0);

// 			const table2 = world.tables[2];
// 			query.testAdd(table2);
// 			expect(table2.length).toBe(10);
// 			expect(query.length).toBe(10);

// 			let j = 0;
// 			for (const vec of query) {
// 				expect(vec).toBeInstanceOf(Entity);
// 				j++;
// 			}
// 			expect(j).toBe(10);
// 		});
// 	});
// }
