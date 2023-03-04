import { memory } from '../utils/memory';
import { initStruct } from './initStruct';
import { BaseEntity } from '../utils/BaseEntity';
import type { Commands } from '../commands';

export class Entity extends BaseEntity {
	static size = 8;
	static alignment = 8;

	private declare __$$b: number;

	constructor(commands?: Commands) {
		super(commands!);
		initStruct(this);
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return memory.views.u64![this.__$$b >> 3];
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return memory.views.u32![this.__$$b >> 2];
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return memory.views.u32![(this.__$$b >> 2) + 1];
	}
}
