import BigUintArray from '../utils/DataTypes/BigUintArray';
import IndexAllocator from '../utils/DataTypes/IndexAllocator';
import SparseSet from '../utils/DataTypes/SparseSet';
import { ThreadProtocol } from '../utils/Thread';
import type { ComponentType } from '../Components';
import type { WorldConfig } from './config';

export default class WorldCommands {
	static fromWorld(config: WorldConfig, componentCount: number) {
		return new this(
			IndexAllocator.with(config.maxEntities, config.threads > 1),
			BigUintArray.with(
				componentCount,
				config.maxEntities,
				config.threads > 1,
			),
			SparseSet.with(config.maxEntities, config.threads > 1),
		);
	}

	#entityCommands: InternalEntityCommands;

	#allocator: IndexAllocator;
	entityData: BigUintArray;
	modifiedEntities: SparseSet;
	constructor(
		allocator: IndexAllocator,
		entityData: BigUintArray,
		modifiedEntities: SparseSet,
	) {
		this.#allocator = allocator;
		this.entityData = entityData;
		this.#entityCommands = new EntityCommands(
			this,
			entityData,
			modifiedEntities,
		) as any;
		this.modifiedEntities = modifiedEntities;
	}

	private __$$setComponents(components: Map<ComponentType, object>) {
		this.#entityCommands.__$$setComponents(components);
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
		this.modifiedEntities.add(id);
		return this;
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	get(id: number): EntityCommands {
		return this.#entityCommands.__$$setId(id);
	}

	[ThreadProtocol.Send](): SerializedWorldCommands {
		return [this.#allocator, this.entityData, this.modifiedEntities];
	}
	static [ThreadProtocol.Receive]([
		alloc,
		entityData,
		modified,
	]: SerializedWorldCommands) {
		return new this(alloc, entityData, modified);
	}
}
type SerializedWorldCommands = [IndexAllocator, BigUintArray, SparseSet];

type InternalEntityCommands = {
	[Key in keyof EntityCommands]: EntityCommands[Key];
} & {
	__$$setComponents(components: Map<ComponentType, object>): void;
	__$$setId(id: number): EntityCommands;
};

class EntityCommands {
	private __$$setId(id: number): this {
		this.#id = id;
		return this;
	}
	private __$$setComponents(components: Map<ComponentType, object>) {
		this.#components = components;
	}

	#id = 0;
	#components: Map<ComponentType, object>;

	#worldCommands: WorldCommands;
	#entityData: BigUintArray;
	#modifiedEntities: SparseSet;
	constructor(
		worldCommands: WorldCommands,
		entityData: BigUintArray,
		modifiedEntities: SparseSet,
	) {
		this.#worldCommands = worldCommands;
		this.#components = null!;
		this.#entityData = entityData;
		this.#modifiedEntities = modifiedEntities;
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
		this.#modifiedEntities.add(this.#id);
		return this;
	}

	remove(Component: ComponentType): this {
		this.#entityData.XOR(
			this.#id,
			1n << BigInt(getMapIndex(this.#components, Component)),
		);
		this.#modifiedEntities.add(this.#id);
		return this;
	}

	despawn(): void {
		this.#worldCommands.despawn(this.#id);
	}
}

function getMapIndex<K>(map: Map<K, any>, key: K): number {
	return [...map.keys()].indexOf(key);
}
