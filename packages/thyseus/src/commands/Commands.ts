import { Entity, type Entities } from '../entities';
import type { Class } from '../components';
import type { World } from '../world';

import { EntityCommandQueue } from './EntityCommandQueue';
import { EntityCommands } from './EntityCommands';
import type { CommandQueue } from './CommandQueue';

/**
 * A class that enqueues commands to be handled by the world at a later point -
 * typically when the `applyCommands` system runs.
 */
export class Commands {
	static intoArgument(world: World): Commands {
		return world.commands;
	}

	#world: World;
	#entities: Entities;
	#queues: Map<Class, CommandQueue>;
	#entityCommandQueue: EntityCommandQueue;

	#entityCommands: EntityCommands;

	constructor(world: World) {
		this.#world = world;
		this.#entities = world.entities;
		this.#entityCommandQueue = new EntityCommandQueue(world);
		this.#queues = new Map([
			[EntityCommandQueue, this.#entityCommandQueue],
		]);
		this.#entityCommands = new EntityCommands(
			this.#entityCommandQueue,
			new Entity(0, 0),
		);
	}

	/**
	 * Adds the provided custom command queue to this world.
	 * @param queue The custom command queue to add.
	 */
	addQueue(queue: CommandQueue): void {
		this.#queues.set(queue.constructor as Class, queue);
	}

	/**
	 * Fetches the provided command queue type for this world.
	 * If it cannot be found, creates the queue.
	 * @param queueType The type of the queue to fetch.
	 * @returns An instance of the provided queue type.
	 */
	getQueue<T extends Class>(queueType: T): InstanceType<T> {
		if (!this.#queues.has(queueType)) {
			this.#queues.set(
				queueType,
				new queueType(this.#world) as CommandQueue,
			);
		}
		return this.#queues.get(queueType) as InstanceType<T>;
	}

	/**
	 * Queues an entity to be spawned.
	 * @param reuse - (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(reuse: boolean = false): EntityCommands {
		const entity = this.#entities.get();
		this.#entityCommandQueue.spawn(entity);
		return this.get(entity, reuse);
	}

	/**
	 * Queues the provided entity to be despawned.
	 * @param entity The Entity to be despawned.
	 */
	despawn(entity: Readonly<Entity>): void {
		this.#entityCommandQueue.despawn(entity as any);
	}

	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param entity An `Entity` component for the Entity to get.
	 * @param reuse (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands` for the provided entity.
	 */
	get(entity: Readonly<Entity>, reuse: boolean = false): EntityCommands {
		if (reuse) {
			this.#entityCommands.entity = entity as any;
			return this.#entityCommands;
		}
		return new EntityCommands(this.#entityCommandQueue, entity as any);
	}

	[Symbol.iterator](): IterableIterator<CommandQueue> {
		return this.#queues.values();
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');
	const { Tag } = await import('../components');
	const { applyCommands } = await import('./applyCommands');

	class ZST extends Tag {}

	class CompA {}
	class CompB {}
	class CompC {}
	class CompD {
		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}

	const createWorld = async () => {
		const world = new World();
		world.components.push(ZST, CompA, CompB, CompC, CompD);
		return world;
	};

	it('returns unique entity handles if reuse is false', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.get(new Entity(0, 0));
		const e2 = commands.get(new Entity(0, 0), false);
		const e3 = commands.get(new Entity(0, 0), false);
		expect(e1).not.toBe(e2);
		expect(e2).not.toBe(e3);
		expect(e1).not.toBe(e3);
	});
	it('returns unique entity handles if reuse is false', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.get(new Entity(0, 0));
		const e2 = commands.get(new Entity(0, 0), true);
		const e3 = commands.get(new Entity(0, 0), true);
		expect(e1).not.toBe(e2);
		expect(e1).not.toBe(e3);
		expect(e2).toBe(e3);
	});

	it('adds Entity component to spawned entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn();
		applyCommands(world);
		expect(world.tables[1].length).toBe(1);
		expect(world.tables[1].getColumn(Entity)[0]).toBe(ent.entity);
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		applyCommands(world);
		const table = world.tables[1];
		expect(table.length).toBe(1);
		expect(table.getColumn(Entity)[0]).toBe(ent.entity);
		expect(world.getComponentsForArchetype(table.archetype)).toStrictEqual([
			Entity,
			ZST,
		]);
	});

	it('removes components', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST).remove(ZST);
		applyCommands(world);
		const table = world.tables[1];
		expect(table.length).toBe(1);
		expect(table.getColumn(Entity)[0]).toBe(ent.entity);
		expect(world.getComponentsForArchetype(table.archetype)).toStrictEqual([
			Entity,
		]);
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		commands.spawn().addType(ZST).despawn();
		applyCommands(world);
		expect(world.tables.length).toBe(1);
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const comp = new CompD(7, 8);
		const ent = commands.spawn().add(comp);
		applyCommands(world);
		const table = world.tables[1];
		expect(table.getColumn(Entity)[0]).toBe(ent.entity);
		expect(table.getColumn(CompD)[0]).toBe(comp);
	});

	it('throws if trying to add/remove Entity', async () => {
		const world = await createWorld();
		const { commands } = world;
		expect(() => commands.spawn().addType(Entity as any)).toThrow();
		expect(() => commands.spawn().add(new Entity(0, 0))).toThrow();
		expect(() => commands.spawn().remove(Entity)).toThrow();
	});
}
