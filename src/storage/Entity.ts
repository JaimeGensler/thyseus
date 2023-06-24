import { Memory } from '../utils';
import { initStruct } from './initStruct';

export class Entity {
	static size = 8;
	static alignment = 8;
	static copy(from: number, to: number) {
		Memory.copy(from, this.size, to);
	}

	private declare __$$b: number;

	constructor() {
		initStruct(this);
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return Memory.views.u64![this.__$$b >> 3];
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return Memory.views.u32![this.__$$b >> 2];
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return Memory.views.u32![(this.__$$b >> 2) + 1];
	}
}
