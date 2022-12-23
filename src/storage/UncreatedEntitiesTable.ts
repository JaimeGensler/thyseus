import { Entity } from './Entity';
import { Table } from './Table';
import type { World } from '../World';

/**
 * A "table" of entities that have not yet been spawned.
 */
export class UncreatedEntitiesTable extends Table {
	constructor(world: World) {
		super(world, new Map(), 0, 0n, 0);
	}
	get isFull() {
		return false;
	}
	move(index: number, targetTable: Table) {
		const id = BigInt(index);
		targetTable.columns.get(Entity)!.u64![targetTable.size] = id;
		targetTable.size++;
		return id;
	}
}
