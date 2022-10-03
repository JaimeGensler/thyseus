import Entities from '../World/Entities';
import { Type } from './Type';

export default class Entity {
	static schema = [Type.u32];
	static size = 4;

	__$$s: Uint32Array;
	__$$i: number;
	__$$e: Entities;
	constructor([store]: [Uint32Array], index: number, entities: Entities) {
		this.__$$s = store;
		this.__$$i = index;
		this.__$$e = entities;
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return (
			(BigInt(this.generation) << 32n) & BigInt(this.__$$s[this.__$$i])
		);
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return this.__$$s[this.__$$i];
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return this.__$$e.generations[this.index];
	}
}
