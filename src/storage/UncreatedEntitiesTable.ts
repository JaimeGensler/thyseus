import { Entity } from './Entity';
import { Table } from './Table';
import type { World } from '../world';

/**
 * A "table" of entities that have not yet been spawned.
 */
export class UncreatedEntitiesTable extends Table {
	#u64: BigUint64Array;
	constructor(world: World) {
		super(world, [], 0, 0n, 0);
		this.#u64 = world.memory.views.u64;
	}
	move(index: number, targetTable: Table) {
		const id = BigInt(index);
		this.#u64[(targetTable.getColumn(Entity) >> 3) + targetTable.size] = id;
		targetTable.size++;
		return id;
	}
}
