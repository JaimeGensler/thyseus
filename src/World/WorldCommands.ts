import BigUintArray from '../utils/DataTypes/BigUintArray';
import Thread from '../utils/Thread';
import IndexAllocator from '../_EXPERIMENTAL/IndexAllocator';
import type { ComponentType } from '../Components';

export default class WorldCommands {
	#entityCommands: InternalEntityCommands;

	#allocator: IndexAllocator;
	#components: Map<ComponentType, object>;
	entityData: BigUintArray;
	modifiedEntities: any;
	constructor(
		allocator: IndexAllocator,
		components: Map<ComponentType, object>,
		entityData: BigUintArray,
	) {
		this.#allocator = allocator;
		this.#components = components;
		this.entityData = entityData;
		this.#entityCommands = new EntityCommands(
			this,
			components,
			entityData,
		) as any;
	}

	// === Entities ===
	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	spawn(): EntityCommands {
		return this.#entityCommands.__$$setId(this.#allocator.get());
	}

	/**
	 * Queues an entity to be despawned.
	 * @param uuid The UUID (Entity & Generation ID) of the entity to despawn.
	 * @returns `this`
	 */
	despawn(id: number): this {
		this.#allocator.free(id);
		this.entityData.set(id, 0n);
		return this;
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	get(id: number): EntityCommands {
		return (this.#entityCommands as any).__$$setId(id);
	}

	[Thread.Send]() {}
	static [Thread.Receive]() {}
}

type InternalEntityCommands = {
	[Key in keyof EntityCommands]: EntityCommands[Key];
} & {
	__$$setId(id: number): EntityCommands;
};

class EntityCommands {
	private __$$setId(id: number): this {
		this.#id = id;
		return this;
	}
	#id = 0;

	#worldCommands: WorldCommands;
	#components: Map<ComponentType, object>;
	#entityData: BigUintArray;
	constructor(
		worldCommands: WorldCommands,
		components: Map<ComponentType, object>,
		entityData: BigUintArray,
	) {
		this.#worldCommands = worldCommands;
		this.#components = components;
		this.#entityData = entityData;
	}

	initialize(Component: ComponentType<any, any>): this {
		const componentId = getMapIndex(this.#components, Component);
		const entityComponents = this.#entityData.get(this.#id);
		if ((entityComponents & (1n << BigInt(componentId))) === 0n) {
			this.insert(Component);
		}
		return this;
	}

	insert(Component: ComponentType<any, any>): this {
		this.#entityData.OR(
			this.#id,
			1n << BigInt(getMapIndex(this.#components, Component)),
		);
		return this;
	}

	remove(Component: ComponentType): this {
		this.#entityData.XOR(
			this.#id,
			1n << BigInt(getMapIndex(this.#components, Component)),
		);
		return this;
	}

	despawn(): void {
		this.#worldCommands.despawn(this.#id);
	}
}

function getMapIndex<K>(map: Map<K, any>, key: K): number {
	return [...map.keys()].indexOf(key);
}
