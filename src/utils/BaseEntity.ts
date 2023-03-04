import type { Struct } from '../struct';
import type { Commands } from '../commands';

type NotFunction<T> = T extends Function ? never : T;

/**
 * A base class to share methods between `Entity`, `EntityCommands`, and `EntityBatchCommands`.
 */
export class BaseEntity {
	#commands: Commands;
	constructor(commands: Commands) {
		this.#commands = commands;
	}

	get id(): bigint {
		return 0n;
	}

	/**
	 * Queues a component to be inserted into this entity.
	 * @param component The component instance to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	add<T extends object>(component: NotFunction<T>): this {
		this.#commands.insertInto(this.id, component);
		return this;
	}

	/**
	 * Queues a component type to be inserted into this entity.
	 * @param componentType The component class to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	addType(componentType: Struct): this {
		this.#commands.insertTypeInto(this.id, componentType);
		return this;
	}

	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: Struct): this {
		this.#commands.removeFrom(this.id, Component);
		return this;
	}

	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void {
		this.#commands.despawn(this.id);
	}
}
