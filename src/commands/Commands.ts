import { alignTo8, Memory } from '../utils';
import { EntityCommands } from './EntityCommands';
import {
	AddComponentCommand,
	RemoveComponentCommand,
	ClearEventQueueCommand,
} from './commandTypes';
import { Entity, type Entities } from '../storage';
import type { Struct } from '../struct';
import type { World } from '../world';

type CommandInstance = {
	__$$b: number;
	deserialize(): void;
	serialize(): void;
};
export class Commands {
	#commands: CommandInstance[] = [];

	#world: World;
	#entities: Entities;
	#entityCommands: EntityCommands;
	#initialValuePointers: number[];
	#pointer: number; // [nextId, ...[size, capacity, pointer]]
	#ownPointer: number;
	constructor(world: World) {
		this.#world = world;
		this.#entities = world.entities;
		this.#commands = [
			new AddComponentCommand(),
			new RemoveComponentCommand(),
			new ClearEventQueueCommand(),
		];

		this.#initialValuePointers = world.threads.queue(() => {
			const size = world.components.reduce(
				(acc, val) => acc + val.size!,
				0,
			);
			const componentPointers = [];
			let pointer = Memory.alloc(size);
			for (const component of world.components) {
				componentPointers.push(pointer);
				if (component.size === 0) {
					continue;
				}
				const instance = new component() as CommandInstance;
				instance.__$$b = pointer;
				instance.serialize();
				pointer += component.size!;
			}
			return componentPointers;
		});
		this.#entityCommands = new EntityCommands(
			world,
			this,
			this.#initialValuePointers,
			0n,
		);
		this.#pointer =
			world.threads.queue(() =>
				Memory.alloc((1 + 3 * world.config.threads) * 4),
			) >> 2;
		this.#ownPointer =
			3 * Atomics.add(Memory.u32, this.#pointer, 1) + this.#pointer + 1;
	}

	get #size() {
		return Memory.u32[this.#ownPointer];
	}
	set #size(val: number) {
		Memory.u32[this.#ownPointer] = val;
	}
	get #capacity() {
		return Memory.u32[this.#ownPointer + 1];
	}
	set #capacity(val: number) {
		Memory.u32[this.#ownPointer + 1] = val;
	}

	/**
	 * Queues an entity to be spawned.
	 * @param reuse - (optional) Whether or not the returned `EntityCommands` should be reused. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(reuse: boolean = false): EntityCommands {
		const command = this.push(AddComponentCommand, Entity.size);
		const entityId = this.#entities.getId();
		command.entityId = entityId;
		command.componentId = 0;
		Memory.u64[command.dataStart >> 3] = entityId;
		command.serialize();
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
		const command = this.push(RemoveComponentCommand);
		command.entityId = entityId;
		command.componentId = 0; // ID of Entity component is always 0
		command.serialize();
	}

	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param entityId The id of the Entity to get.
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
			: new EntityCommands(
					this.#world,
					this,
					this.#initialValuePointers,
					entityId,
			  );
	}

	/**
	 * Pushes a command of type `T` to the queue and returns a mutable instance of that command.
	 *
	 * Added Commands must have been registered - only useable for internal commands right now.
	 * @param commandType The type of command to add.
	 * @param additionalSize The _additional size_ (beyond the size of the commandType) this command will need.
	 * @returns A mutable instance of the provided command type.
	 */
	push<T extends Struct>(
		commandType: T,
		additionalSize: number = 0,
	): InstanceType<T> {
		// TODO: Flip this so that we just accept a command
		// Leave the responsibility of allocation reduction with consumers
		// Requires us to box data, probably
		const { u32 } = Memory;
		const commandId = this.#commands.findIndex(
			command => command.constructor === commandType,
		);
		const command = this.#commands[commandId];
		const addedSize = 8 + alignTo8(commandType.size! + additionalSize);
		let newSize = this.#size + addedSize;
		if (this.#capacity < newSize) {
			newSize <<= 1; // Double new size
			Memory.reallocAt((this.#ownPointer + 2) << 2, newSize);
			this.#capacity = newSize;
		}
		const queueEnd = u32[this.#ownPointer + 2] + this.#size;
		u32[queueEnd >> 2] = addedSize;
		u32[(queueEnd + 4) >> 2] = commandId;
		this.#size += addedSize;
		command.__$$b = queueEnd + 8;
		return command as InstanceType<T>;
	}

	*[Symbol.iterator](): Iterator<object> {
		const { u32 } = Memory;
		const queueDataLength = 1 + u32[this.#pointer] * 3;
		for (
			let queueOffset = 1;
			queueOffset < queueDataLength;
			queueOffset += 3
		) {
			const start = u32[this.#pointer + queueOffset + 2];
			const end = start + u32[this.#pointer + queueOffset];
			for (
				let current = start;
				current < end;
				current += u32[current >> 2]
			) {
				const commandId = u32[(current + 4) >> 2];
				const command = this.#commands[commandId];
				command.__$$b = current + 8;
				command.deserialize();
				yield command as object;
			}
		}
	}

	// Marked private so consumers don't know it's available.
	/**
	 * A function to clear the queue of all commands.
	 *
	 * **NOTE: Is not thread-safe!**
	 */
	private reset(): void {
		const { u32 } = Memory;
		const queueDataLength = 1 + u32[this.#pointer] * 3;
		for (
			let queueOffset = 1;
			queueOffset < queueDataLength;
			queueOffset += 3
		) {
			Memory.set(this.#ownPointer, this.#capacity, 0);
			u32[this.#pointer + queueOffset] = 0;
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;
	const { World } = await import('../world');

	beforeEach(() => {
		Memory.init(10_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

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
		__$$b = 0;
		deserialize() {
			this.x = Memory.u32[this.__$$b >> 2];
			this.y = Memory.u32[(this.__$$b + 4) >> 2];
		}
		serialize() {
			Memory.u32[this.__$$b >> 2] = this.x;
			Memory.u32[(this.__$$b + 4) >> 2] = this.y;
		}

		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}
	class StringComponent {
		static size = 12;
		static alignment = 4;
		__$$b = 0;
		static copy() {}
		static drop() {}
		deserialize() {}
		serialize() {}

		value: string;
		constructor(val = 'hi') {
			this.value = val;
		}
	}

	const createWorld = () =>
		World.new({ isMainThread: true })
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
			.registerComponent(StringComponent)
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
			expect(command).toBeInstanceOf(AddComponentCommand);
			expect((command as AddComponentCommand).entityId).toBe(ent.id);
			if (i === 0) {
				expect((command as AddComponentCommand).componentId).toBe(0);
			} else {
				expect((command as AddComponentCommand).componentId).toBe(
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
				expect(command).toBeInstanceOf(RemoveComponentCommand);
				expect((command as RemoveComponentCommand).entityId).toBe(
					ent.id,
				);
				expect((command as RemoveComponentCommand).componentId).toBe(
					zstID,
				);
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
				expect(command).toBeInstanceOf(RemoveComponentCommand);
				expect((command as RemoveComponentCommand).entityId).toBe(
					ent.id,
				);
				expect((command as RemoveComponentCommand).componentId).toBe(0);
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

			const { entityId, componentId, dataStart } = command;
			expect(entityId).toBe(ent.id);
			expect(componentId).toBe(5);
			const u32 = Memory.u32.subarray(
				dataStart >> 2,
				(dataStart + CompD.size) >> 2,
			);
			expect(u32[0]).toBe(23);
			expect(u32[1]).toBe(42);
			i++;
		}
	});

	it('inserts sized types with specified data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().add(new CompD(15, 16));
		let i = 0;
		for (const command of commands) {
			if (!(command instanceof AddComponentCommand) || i === 0) {
				continue;
			}
			const { dataStart, entityId, componentId } = command;

			expect(entityId).toBe(ent.id);
			expect(componentId).toBe(5);
			const u32 = Memory.u32.subarray(
				dataStart >> 2,
				(dataStart + CompD.size) >> 2,
			);
			expect(u32[0]).toBe(15);
			expect(u32[1]).toBe(16);
		}
	});

	it('copies pointers for default values', async () => {
		const world = await createWorld();
		const commands = new Commands(world);
		const ent1 = commands.spawn().addType(StringComponent);
		const ent2 = commands.spawn().addType(StringComponent);
		const { u32 } = Memory;
		let previousPointer = 0;
		for (const command of commands) {
			if (!(command instanceof AddComponentCommand)) {
				continue;
			}
			const { componentId, dataStart } = command;
			if (componentId === 6) {
				expect(u32[(dataStart + 8) >> 2]).not.toBe(previousPointer);
				previousPointer = u32[(dataStart + 8) >> 2];
			}
		}
	});

	it('copies pointers for passed values', async () => {
		const world = await createWorld();
		const commands = new Commands(world);
		const component = new StringComponent('test');
		const ent = commands.spawn().add(component);
		const { u32 } = Memory;

		for (const command of commands) {
			if (!(command instanceof AddComponentCommand)) {
				continue;
			}
			const { componentId, dataStart } = command;
			if (componentId === 6) {
				expect(
					Memory.u32[((component as any).__$$b + 8) >> 2],
				).not.toBe(u32[(dataStart + 8) >> 2]);
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
		for (const command of commands) {
			iterations++;
		}
		expect(iterations).toBe(0);
	});
}
