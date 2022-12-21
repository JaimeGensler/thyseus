import { Entity } from './Entity';
import { Table } from './Table';

/**
 * A "table" of entities that have not yet been spawned.
 */
export class UncreatedEntitiesTable extends Table {
	constructor() {
		super(new Map(), 0, new Uint32Array(0), 0);
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
