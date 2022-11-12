import { getGeneration, getIndex } from '../utils/entityId';
import { TYPE_IDS } from './addField';
import type { WorldCommands } from '../World/WorldCommands';
import type { ComponentStore, ComponentType } from './types';

// TODO: Add u32 to schema, refactor entityIndex and generation to just
// pull data out of the buffer.
export class Entity {
	static schema = TYPE_IDS.u64;
	static size = 8;

	store: ComponentStore;
	index: number;
	commands: WorldCommands;
	constructor(store: ComponentStore, index: number, commands: WorldCommands) {
		this.store = store;
		this.index = index;
		this.commands = commands;
	}

	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint {
		return this.store.u64![this.index];
	}

	/**
	 * The index of this entity (uint32).
	 */
	get entityIndex(): number {
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
	insert(Component: ComponentType): this {
		this.commands.insertInto(this.id, Component);
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: ComponentType): this {
		this.commands.removeFrom(this.id, Component);
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.commands.despawn(this.id);
	}
}
