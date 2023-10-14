import { EntityCommands } from './EntityCommands';
import { alignTo8 } from '../utils';
import { Store } from '../storage';
import {
	AddComponentCommand,
	RemoveComponentCommand,
} from './ComponentCommands';
import { Entity, type Entities } from '../entities';
import type { Struct, StructInstance } from '../components';
import type { World } from '../world';

export type Command = Struct & {
	iterate(commands: Commands, world: World): any;
};
export class Commands {
	#world: World;
	#entities: Entities;
	commandTypes: Command[];
	#commands: StructInstance[];
	#queues: Store[];

	#entityCommands: EntityCommands;
	constructor(world: World, commandTypes: Command[]) {
		this.#world = world;
		this.#entities = world.entities;
		this.commandTypes = commandTypes;
		this.#commands = this.commandTypes.map(command => new command());
		this.#queues = this.commandTypes.map(() => new Store(0));
		this.#entityCommands = new EntityCommands(world, this, 0n);
	}

	/**
	 * Queues an entity to be spawned.
	 * @param reuse - (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(reuse: boolean = false): EntityCommands {
		const entityId = this.#entities.getId();
		this.push(
			AddComponentCommand.with(entityId, 0, new Entity(entityId)),
			Entity.size,
		);
		return this.getById(entityId, reuse);
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
		this.push(RemoveComponentCommand.with(entityId, 0));
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

	/**
	 * Pushes a command to the queue.
	 *
	 * Added Commands must have been registered - currently only useable for internal commands.
	 * @param command The command to add.
	 * @param additionalSize The _additional size_ (beyond the size of the commandType) this command will need.
	 */
	push(command: StructInstance, additionalSize: number = 0): void {
		const commandType = command.constructor as Command;
		const store = this.#queues[this.commandTypes.indexOf(commandType)];
		const addedSize = commandType.size! + alignTo8(additionalSize);
		if (store.byteLength < store.length + addedSize) {
			store.resize((store.length + addedSize) * 2);
		}
		store.offset = store.length;
		store.length += addedSize;
		command.serialize!(store);
	}

	*iterate<T extends Command>(type: T): Generator<Readonly<InstanceType<T>>> {
		const id = this.commandTypes.indexOf(type);
		const store = this.#queues[id];
		const command = this.#commands[id];
		store.offset = 0;
		while (store.offset < store.length) {
			command.deserialize!(store);
			yield command as InstanceType<T>;
		}
	}

	// Marked private so consumers don't know it's available.
	/**
	 * A function to clear the queue of all commands.
	 *
	 * **NOTE: This method is not thread-safe!**
	 * You must have exclusive access to the world to call this.
	 */
	private reset(): void {
		for (const queue of this.#queues) {
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
		static size = 8;
		static alignment = 4;
		deserialize(store: Store) {
			this.x = store.readU32();
			this.y = store.readU32();
		}
		serialize(store: Store) {
			store.writeU32(this.x);
			store.writeU32(this.y);
		}

		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}

	const createWorld = () =>
		World.new()
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
			.build();

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
			expect(command.componentId).toBe(0);
		}
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const zstID = world.getComponentId(ZST);
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		let i = 0;
		for (const command of commands.iterate(AddComponentCommand)) {
			if (i === 0) {
				expect(command.entityId).toBe(ent.id);
				expect(command.componentId).toBe(0);
				command.store!.offset += 8;
			} else {
				expect(command.entityId).toBe(ent.id);
				expect(command.componentId).toBe(zstID);
			}
			i++;
		}
	});

	it('adds RemoveComponentCommands', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST).remove(ZST);
		const zstID = world.getComponentId(ZST);
		for (const command of commands.iterate(RemoveComponentCommand)) {
			expect(command).toBeInstanceOf(RemoveComponentCommand);
			expect(command.entityId).toBe(ent.id);
			expect(command.componentId).toBe(zstID);
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
			expect(command.componentId).toBe(0);
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
			const { entityId, componentId } = command;
			expect(entityId).toBe(ent.id);
			expect(componentId).toBe(5);
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
			const { store, entityId, componentId } = command;
			expect(entityId).toBe(ent.id);
			expect(componentId).toBe(5);
			expect(store?.readU32()).toBe(15);
			expect(store?.readU32()).toBe(16);
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
