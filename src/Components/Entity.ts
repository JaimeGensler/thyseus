import Entities from '../World/Entities';
import { Type } from './Type';

export default class Entity {
	static schema = [Type.u32];
	static size = 4;

	$$__s: Uint32Array;
	$$__i: number;
	$$__e: Entities;
	constructor([store]: [Uint32Array], index: number, entities: Entities) {
		this.$$__s = store;
		this.$$__i = index;
		this.$$__e = entities;
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return (
			(BigInt(this.generation) << 32n) & BigInt(this.$$__s[this.$$__i])
		);
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return this.$$__s[this.$$__i];
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return this.$$__e.generations[this.index];
	}
}
