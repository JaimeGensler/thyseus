import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { Memory } from '../utils/Memory';
import { initStruct } from './initStruct';
import { BaseEntity } from '../utils/BaseEntity';
import type { Commands } from '../commands';
import type { Struct } from '../struct';
import type { Entities } from './Entities';

export class Entity extends BaseEntity {
	static size = 8;
	static alignment = 8;

	private declare __$$b: number;

	#entities: Entities;

	constructor(commands?: Commands, entities?: Entities) {
		DEV_ASSERT(
			commands && entities,
			'An instance of the Entity component did not receive World commands and entities. This is likely a result of using Entity as a substruct, which is currently not supported.',
		);
		super(commands!);
		this.#entities = entities!;
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

	/**
	 * Verifies if this entity has a specific component type.
	 * @param componentType The type (class) of the component to detect.
	 * @returns `boolean`, true if the entity has the component and false if it does not.
	 */
	hasComponent(componentType: Struct): boolean {
		return this.#entities.hasComponent(this.id, componentType);
	}
}
