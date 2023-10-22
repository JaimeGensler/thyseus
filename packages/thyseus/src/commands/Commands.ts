import { Entity, type Entities } from '../entities';
import type { Class } from '../components';
import type { World } from '../world';

import {
	AddComponentCommand,
	RemoveComponentCommand,
} from './ComponentCommands';
import { EntityCommands } from './EntityCommands';
import type { Command } from './Command';

export class Commands {
	#world: World;
	#entities: Entities;
	commandTypes: Command[];
	#queues: Map<Class, object[]>;

	#entityCommands: EntityCommands;
	constructor(world: World) {
		this.#world = world;
		this.#entities = world.entities;
		this.commandTypes = [AddComponentCommand, RemoveComponentCommand];
		this.#queues = new Map();
		this.#entityCommands = new EntityCommands(world, this, 0n);
	}

	/**
	 * Queues an entity to be spawned.
	 * @param reuse - (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(reuse: boolean = false): EntityCommands {
		const entity = this.#entities.get();
		this.push(new AddComponentCommand(entity, entity));
		return this.get(entity, reuse);
	}

	/**
	 * Queues the provided entity to be despawned.
	 * @param entity The Entity to be despawned.
	 */
	despawn(entity: Readonly<Entity>): void {
		this.despawnById(entity.id);
	}
	/**
	 * Queues the provided entity to be despawned.
	 * @param entityId The id of the Entity to be despawned.
	 */
	despawnById(entityId: bigint): void {
		if (this.#entities.wasDespawned(entityId)) {
			return;
		}
		this.push(new RemoveComponentCommand(entityId, Entity));
	}

	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param entity An `Entity` component for the Entity to get.
	 * @param reuse (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands` for the provided entity.
	 */
	get(entity: Readonly<Entity>, reuse: boolean = false): EntityCommands {
		return this.getById(entity.id, reuse);
	}

	/**
	 * Gets `EntityCommands` given an Entity's id.
	 * @param entityId The id of the Entity to get.
	 * @param reuse (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands` for the provided entity.
	 */
	getById(entityId: bigint, reuse: boolean = false): EntityCommands {
		return reuse
			? this.#entityCommands.setId(entityId)
			: new EntityCommands(this.#world, this, entityId);
	}

	#getCommandQueue<T extends Command>(commandType: T): InstanceType<T>[] {
		if (!this.#queues.has(commandType)) {
			this.#queues.set(commandType, []);
			this.commandTypes.push(commandType);
		}
		return this.#queues.get(commandType)! as InstanceType<T>[];
	}

	/**
	 * Pushes a command to the queue.
	 *
	 * Added Commands must have been registered - currently only useable for internal commands.
	 * @param command The command to add.
	 */
	push(command: object): void {
		const commandType = command.constructor as Command;
		const queue = this.#getCommandQueue(commandType);
		queue.push(command);
	}

	iterate<T extends Command>(type: T): IterableIterator<InstanceType<T>> {
		return this.#getCommandQueue(type)[Symbol.iterator]();
	}

	// Marked private so consumers don't know it's available.
	/**
	 * A function to clear the queue of all commands.
	 *
	 * **NOTE: This method is not thread-safe!**
	 * You must have exclusive access to the world to call this.
	 */
	private reset(): void {
		for (const queue of this.#queues.values()) {
			queue.length = 0;
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	class ZST {
		static size = 0;
		static alignment = 1;
		deserialize() {}
		serialize() {}
	}
	class Struct {
		static size = 1;
		static alignment = 1;
		deserialize() {}
		serialize() {}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}

	const createWorld = async () => {
		const world = await World.new().build();
		world.components.push(ZST, CompA, CompB, CompC, CompD);
		return world;
	};

	it('returns unique entity handles if reuse is false', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.getById(0n);
		const e2 = commands.getById(1n, false);
		const e3 = commands.getById(2n, false);
		expect(e1).not.toBe(e2);
		expect(e2).not.toBe(e3);
		expect(e1).not.toBe(e3);
	});
	it('returns unique entity handles if reuse is false', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.getById(0n);
		const e2 = commands.getById(1n, true);
		const e3 = commands.getById(2n, true);
		expect(e1 === e2).toBe(false);
		expect(e1 === e3).toBe(false);
		expect(e2 === e3).toBe(true);
	});

	it('adds Entity component to spawned entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn();
		for (const command of commands.iterate(AddComponentCommand)) {
			expect(command).toBeInstanceOf(AddComponentCommand);
			expect(command.entityId).toBe(ent.id);
			expect(command.component).toBeInstanceOf(Entity);
		}
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		let i = 0;
		for (const command of commands.iterate(AddComponentCommand)) {
			if (i === 0) {
				expect(command.entityId).toBe(ent.id);
				expect(command.component).toBeInstanceOf(Entity);
			} else {
				expect(command.entityId).toBe(ent.id);
				expect(command.component).toBeInstanceOf(ZST);
			}
			i++;
		}
	});

	it('adds RemoveComponentCommands', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST).remove(ZST);
		for (const command of commands.iterate(RemoveComponentCommand)) {
			expect(command).toBeInstanceOf(RemoveComponentCommand);
			expect(command.entityId).toBe(ent.id);
			expect(command.componentType).toBe(ZST);
		}
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		ent.despawn();
		for (const command of commands.iterate(RemoveComponentCommand)) {
			expect(command).toBeInstanceOf(RemoveComponentCommand);
			expect(command.entityId).toBe(ent.id);
			expect(command.componentType).toBe(Entity);
		}
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(CompD);
		let i = 0;
		for (const command of commands.iterate(AddComponentCommand)) {
			if (i === 0) {
				continue;
			}
			const { entityId, component } = command;
			expect(entityId).toBe(ent.id);
			expect(component).toBeInstanceOf(CompD);
		}
	});

	it('inserts types with specified data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().add(new CompD(15, 16));
		let i = 0;
		for (const command of commands.iterate(AddComponentCommand)) {
			if (i === 0) {
				continue;
			}
			const { entityId, component } = command;
			expect(entityId).toBe(ent.id);
			expect(component).toBeInstanceOf(CompD);
			if (component instanceof CompD) {
				expect(component.x).toBe(15);
				expect(component.y).toBe(16);
			}
		}
	});

	it('throws if trying to add/remove Entity', async () => {
		const world = await createWorld();
		const { commands } = world;
		expect(() => commands.spawn().addType(Entity)).toThrow();
		expect(() => commands.spawn().add(new Entity())).toThrow();
		expect(() => commands.spawn().remove(Entity)).toThrow();
	});

	it('reset clears all queues', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(CompA);
		(commands as any).reset();
		let iterations = 0;
		for (const command of commands.iterate(AddComponentCommand)) {
			iterations++;
		}
		for (const command of commands.iterate(RemoveComponentCommand)) {
			iterations++;
		}
		expect(iterations).toBe(0);
	});
}
