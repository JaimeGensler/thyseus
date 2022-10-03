import type Entities from './Entities';
import type { ComponentType } from '../Components';

export default class WorldCommands {
	queue = new Map<bigint, bigint>(); // Map<eid, tableid>

	#entities: Entities;
	#entityCommands: InternalEntityCommands;
	constructor(entities: Entities, components: Set<ComponentType>) {
		this.#entities = entities;
		this.#entityCommands = new EntityCommands(
			this,
			entities,
			components,
			this.queue,
		) as any;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	spawn(): EntityCommands {
		return this.#entityCommands.__$$setId(this.#entities.spawn());
	}

	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): this {
		this.queue.set(id, 0n);
		return this;
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	get(id: bigint): EntityCommands {
		return this.#entityCommands.__$$setId(id);
	}
}

type InternalEntityCommands = {
	[Key in keyof EntityCommands]: EntityCommands[Key];
} & {
	__$$setId(id: bigint): EntityCommands;
};

class EntityCommands {
	private __$$setId(id: bigint): this {
		this.#id = id;
		return this;
	}
	#id = 0n;

	#worldCommands: WorldCommands;
	#entities: Entities;
	#components: Set<ComponentType>;
	#queue: Map<bigint, bigint>;
	constructor(
		worldCommands: WorldCommands,
		entities: Entities,
		components: Set<ComponentType>,
		queue: Map<bigint, bigint>,
	) {
		this.#worldCommands = worldCommands;
		this.#entities = entities;
		this.#components = components;
		this.#queue = queue;
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param Component The Component **class** to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	insert(Component: ComponentType<any>): this {
		this.#queue.set(
			this.#id,
			(this.#queue.get(this.#id) ?? this.#entities.getTableId(this.#id)) &
				(1n << BigInt(getSetIndex(this.#components, Component))),
		);
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: ComponentType): this {
		this.#queue.set(
			this.#id,
			(this.#queue.get(this.#id) ?? this.#entities.getTableId(this.#id)) ^
				(1n << BigInt(getSetIndex(this.#components, Component))),
		);
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#worldCommands.despawn(this.#id);
	}
}

const getSetIndex = <T>(set: Set<T>, key: T) => [...set].indexOf(key);
