import { Type } from './Type';
import { getGeneration, getIndex } from '../utils/entityId';
import type WorldCommands from '../World/WorldCommands';
import type { ComponentType } from './types';

export default class Entity {
	static schema = [Type.u64] as [Type.u64];
	static size = 4;

	__$$s: BigUint64Array;
	__$$i: number;
	__$$c: WorldCommands;
	constructor(
		store: [BigUint64Array],
		index: number,
		commands: WorldCommands,
	) {
		const [x] = store;
		this.__$$s = x;
		this.__$$i = index;
		this.__$$c = commands;
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return this.__$$s[this.__$$i];
	}

	/**
	 * The index of this entity (uint32).
	 */
	get index(): number {
		return getIndex(this.id);
	}

	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number {
		return getGeneration(this.id);
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param Component The Component **class** to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	insert(Component: ComponentType<any>): this {
		this.__$$c.insertInto(this.id, Component);
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: ComponentType): this {
		this.__$$c.removeFrom(this.id, Component);
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.__$$c.despawn(this.id);
	}
}
