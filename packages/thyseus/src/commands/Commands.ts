import { alignTo8 } from '../utils';
import { EntityCommands } from './EntityCommands';
import {
	AddComponentCommand,
	AddComponentTypeCommand,
	RemoveComponentTypeCommand,
	ClearEventQueueCommand,
} from './commandTypes';
import { Entity, type Entities, Store } from '../storage';
import type { Struct, StructInstance } from '../struct';
import type { World } from '../world';

export class Commands {
	#commands: StructInstance[];
	#commandTypes: Struct[];
	#world: World;
	#entities: Entities;
	#entityCommands: EntityCommands;
	#store: Store;
	#length: number;
	constructor(world: World) {
		this.#length = 0;
		this.#world = world;
		this.#entities = world.entities;
		this.#commandTypes = [
			AddComponentCommand,
			AddComponentTypeCommand,
			RemoveComponentTypeCommand,
			ClearEventQueueCommand,
		];
		this.#commands = this.#commandTypes.map(
			command => new command() as StructInstance,
		);

		this.#entityCommands = new EntityCommands(world, this, 0n);
		this.#store = new Store(0);
	}

	/**
	 * Queues an entity to be spawned.
	 * @param reuse - (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(reuse: boolean = false): EntityCommands {
		const entityId = this.#entities.getId();
		const cmd = AddComponentCommand.with(
			entityId,
			0,
			new Entity(entityId) as any,
		);
		this.push(cmd, Entity.size);
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
		this.push(RemoveComponentTypeCommand.with(entityId, 0));
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
		const commandType = command.constructor as Struct;
		const addedSize = 8 + alignTo8(commandType.size! + additionalSize);
		let newLength = this.#length + addedSize;
		if (this.#store.byteLength < newLength) {
			newLength *= 2;
			this.#store.resize(newLength);
		}
		this.#store.offset = this.#length;
		this.#store.writeU32(addedSize);
		this.#store.writeU32(this.#commandTypes.indexOf(commandType));
		this.#length += addedSize;
		command.serialize!(this.#store);
	}

	*[Symbol.iterator](): Iterator<object> {
		this.#store.offset = 0;
		while (this.#store.offset < this.#length) {
			const nextOffset = this.#store.offset + this.#store.readU32();
			const command = this.#commands[this.#store.readU32()];
			command.deserialize!(this.#store);
			yield command;
			this.#store.offset = nextOffset;
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
		this.#length = 0;
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
		for (const command of commands) {
			expect(command).toBeInstanceOf(AddComponentCommand);
			expect((command as AddComponentCommand).entityId).toBe(ent.id);
			expect((command as AddComponentCommand).componentId).toBe(0);
		}
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const zstID = world.getComponentId(ZST);
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		let i = 0;
		for (const command of commands) {
			expect(command).toBeInstanceOf(AddComponentTypeCommand);
			expect((command as AddComponentTypeCommand).entityId).toBe(ent.id);
			if (i === 0) {
				expect((command as AddComponentTypeCommand).componentId).toBe(
					0,
				);
			} else {
				expect((command as AddComponentTypeCommand).componentId).toBe(
					zstID,
				);
			}
			i++;
		}
	});

	it('adds RemoveComponentCommands', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST).remove(ZST);
		const zstID = world.getComponentId(ZST);
		let i = 0;
		for (const command of commands) {
			if (i == 2) {
				expect(command).toBeInstanceOf(RemoveComponentTypeCommand);
				expect((command as RemoveComponentTypeCommand).entityId).toBe(
					ent.id,
				);
				expect(
					(command as RemoveComponentTypeCommand).componentId,
				).toBe(zstID);
			}
			i++;
		}
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		ent.despawn();
		let i = 0;
		for (const command of commands) {
			if (i === 2) {
				expect(command).toBeInstanceOf(RemoveComponentTypeCommand);
				expect((command as RemoveComponentTypeCommand).entityId).toBe(
					ent.id,
				);
				expect(
					(command as RemoveComponentTypeCommand).componentId,
				).toBe(0);
			}
			i++;
		}
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(CompD);
		let i = 0;
		for (const command of commands) {
			if (!(command instanceof AddComponentCommand) || i === 0) {
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
		for (const command of commands) {
			if (!(command instanceof AddComponentCommand) || i === 0) {
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
		for (const command of commands) {
			iterations++;
		}
		expect(iterations).toBe(0);
	});
}
