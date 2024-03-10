import { Entity } from '../entities';

import { swapRemove } from './swapRemove';
import { isSizedComponent } from './Tag';
import type { Class } from './Class';

/**
 * Contains component data for entities with the same archetype.
 * Entities are rows, component types are columns.
 */
export class Table {
	static createEmpty(): Table {
		return new this([], 0n, 0);
	}

	id: number;
	archetype: bigint;
	#components: Class[];
	#columns: [...Array<object[]>];
	constructor(components: Class[], archetype: bigint, id: number) {
		this.#components = components.filter(isSizedComponent);
		this.archetype = archetype;
		this.id = id;
		this.#columns = this.#components.map(() => []) as any;
	}

	/**
	 * The number of entities in this table.
	 */
	get length(): number {
		return this.#columns[0].length;
	}

	/**
	 * Moves the entity at `row` and all its associated data into `targetTable`.
	 * @param row The row of the entity to move.
	 * @param targetTable The table to move that entity to.
	 */
	move(
		row: number,
		targetTable: Table,
		components: object[],
	): Entity | undefined {
		for (let i = 0; i < this.#columns.length; i++) {
			const componentType = this.#components[i];
			const element = swapRemove(this.#columns[i], row)!;
			if (targetTable.hasColumn(componentType)) {
				targetTable.getColumn(componentType).push(element);
			}
		}
		for (const component of components) {
			if (targetTable.hasColumn(component.constructor as any)) {
				targetTable
					.getColumn(component.constructor as any)
					?.push(component);
			}
		}
		return this.#columns[0]?.[this.#columns[0].length - 1] as
			| Entity
			| undefined;
	}

	/**
	 * Returns a boolean indicating if this table contains a column for the provided component type.
	 *
	 * Tables do not create columns for ZSTs so will always return false when called with `Tag` components.
	 * @param componentType The type of the component to check for.
	 * @returns A boolean, true if this table has a column for the provided component type.
	 */
	hasColumn(componentType: Class): boolean {
		return this.#components.includes(componentType);
	}
	/**
	 * Gets the column for the provided component.
	 *
	 * Assumes the column exists - check for presence with `hasColumn()` first.
	 * @param componentType The type of the component to fetch the column for.
	 * @returns The column (`object[]`) for the provided component type.
	 */
	getColumn<T extends Class>(componentType: T): InstanceType<T>[] {
		return this.#columns[
			this.#components.indexOf(componentType)
		] as InstanceType<T>[];
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { Tag } = await import('./Tag');

	class Vec3 {
		x: number;
		y: number;
		z: number;
		constructor(x = 0, y = 0, z = 0) {
			this.x = x;
			this.y = y;
			this.z = z;
		}
	}

	const createTable = (...components: Class[]) =>
		new Table(components, 0n, 0);

	const addToTable = (
		table: Table,
		entity: Entity,
		...components: object[]
	) => {
		table.getColumn(Entity).push(entity);
		for (const component of components) {
			table.getColumn(component.constructor as any).push(component);
		}
	};

	it('add() adds an item', async () => {
		const table = createTable(Entity);
		const entityColumn = table.getColumn(Entity);
		expect(table.length).toBe(0);

		const e1 = new Entity(4);
		const e2 = new Entity(5);
		addToTable(table, e1);
		addToTable(table, e2);

		expect(entityColumn[0]).toBe(e1);
		expect(entityColumn[1]).toBe(e2);
	});

	it('adds an element', async () => {
		const table = createTable(Entity);
		expect(table.length).toBe(0);

		addToTable(table, new Entity(0));
		expect(table.length).toBe(1);

		const entityColumn = table.getColumn(Entity);
		expect(entityColumn[0].id).toBe(0n);

		addToTable(table, new Entity(3));
		expect(table.length).toBe(2);

		expect(entityColumn[0].id).toBe(0n);
		expect(entityColumn[1].id).toBe(3n);
	});

	it('moves elements from one table to another', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity, Vec3);

		addToTable(fromTable, new Entity(3), new Vec3(1, 2, 3));
		addToTable(fromTable, new Entity(1), new Vec3(7, 8, 9));
		addToTable(toTable, new Entity(4), new Vec3(0, 0, 0));

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);

		const fromTableEntityColumn = fromTable.getColumn(Entity);
		expect(fromTableEntityColumn[0].id).toBe(3n);

		const fromTableVec3Column = fromTable.getColumn(Vec3);
		const toTableVec3Column = toTable.getColumn(Vec3);

		fromTable.move(0, toTable, []);
		expect(fromTable.length).toBe(1);
		expect(toTable.length).toBe(2);

		let v3 = toTableVec3Column[1];
		expect(v3.x).toBe(1);
		expect(v3.y).toBe(2);
		expect(v3.z).toBe(3);

		expect(fromTableEntityColumn[0].id).toBe(1n);
		v3 = fromTableVec3Column[0];
		expect(v3.x).toBe(7);
		expect(v3.y).toBe(8);
		expect(v3.z).toBe(9);
	});

	it('deletes elements, swaps in last elements', async () => {
		const table = createTable(Entity, Vec3);

		addToTable(table, new Entity(1));
		addToTable(table, new Entity(2));
		addToTable(table, new Entity(3));
		addToTable(table, new Entity(4));
		expect(table.length).toBe(4);

		const entityColumn = table.getColumn(Entity);
		const vecColumn = table.getColumn(Vec3);
		vecColumn.push(
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
			new Vec3(7, 8, 9),
			new Vec3(10, 11, 12),
		);

		table.move(1, Table.createEmpty(), []);
		expect(table.length).toBe(3);
		expect(entityColumn[0].id).toBe(1n);
		expect(vecColumn[0].x).toBe(1);
		expect(vecColumn[0].y).toBe(2);
		expect(vecColumn[0].z).toBe(3);
		expect(entityColumn[1].id).toBe(4n);
		expect(vecColumn[1].x).toBe(10);
		expect(vecColumn[1].y).toBe(11);
		expect(vecColumn[1].z).toBe(12);
		expect(entityColumn[2].id).toBe(3n);
		expect(vecColumn[2].x).toBe(7);
		expect(vecColumn[2].y).toBe(8);
		expect(vecColumn[2].z).toBe(9);
	});

	it.todo('move() moves entity locations', async () => {
		const table = createTable(Entity);
		const empty = Table.createEmpty();
		expect(table.length).toBe(0);

		const id1 = 4n;
		const id2 = (1n << 32n) | 5n;
		const e1 = new Entity(4);
		const e2 = new Entity(5);
		addToTable(table, e1);
		addToTable(table, e2);

		// expect(table.move(0, empty)).toBe(e2);
		// expect(table.move(0, empty)).toBe(e2);
	});

	// v0.6 changelog bugfix
	it('backfills elements for all stores', async () => {
		const fromTable = createTable(Entity, Vec3);
		const toTable = createTable(Entity);
		const fromTableEntityColumn = fromTable.getColumn(Entity);
		const fromTableVec3Column = fromTable.getColumn(Vec3);
		const toTableEntityColumn = toTable.getColumn(Entity);

		addToTable(fromTable, new Entity(3));
		addToTable(fromTable, new Entity(0));
		addToTable(toTable, new Entity(4));

		expect(fromTable.length).toBe(2);
		expect(toTable.length).toBe(1);
		expect(fromTableEntityColumn[0].id).toBe(3n);

		fromTableVec3Column.push(new Vec3(1, 2, 3), new Vec3(7, 8, 9));
		fromTable.move(0, toTable, []);

		expect(toTableEntityColumn[1].id).toBe(3n);
		expect(fromTableEntityColumn[0].id).toBe(1n);
		expect(fromTableVec3Column[0].x).toBe(7);
		expect(fromTableVec3Column[0].y).toBe(8);
		expect(fromTableVec3Column[0].z).toBe(9);
	});

	// v0.6 changelog bugfix
	it('does not create columns for ZSTs', async () => {
		class ZST extends Tag {}
		const table = createTable(Entity, Vec3, ZST);
		expect(table.hasColumn(ZST)).toBe(false);
	});
}
