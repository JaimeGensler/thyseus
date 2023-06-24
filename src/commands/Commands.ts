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

export class Commands {
	#commands: { __$$b: number }[] = [];

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
				const instance =
					component === Entity
						? new (component as any)(this, world.entities)
						: (new component() as { __$$b: number });
				Memory.copy(instance.__$$b, component.size!, pointer);
				Memory.free(instance.__$$b);
				pointer += component.size!;
			}
			return componentPointers;
		});
		this.#entityCommands = new EntityCommands(
			world,
			0n,
			this.#initialValuePointers,
		);
		this.#pointer =
			world.threads.queue(() =>
				Memory.alloc((1 + 3 * world.config.threads) * 4),
			) >> 2;
		this.#ownPointer =
			3 * Atomics.add(Memory.views.u32, this.#pointer, 1) +
			this.#pointer +
			1;
	}

	get #size() {
		return Memory.views.u32[this.#ownPointer];
	}
	set #size(val: number) {
		Memory.views.u32[this.#ownPointer] = val;
	}
	get #capacity() {
		return Memory.views.u32[this.#ownPointer + 1];
	}
	set #capacity(val: number) {
		Memory.views.u32[this.#ownPointer + 1] = val;
	}

	/**
	 * Queues an entity to be spawned.
	 * @param unique - (optional) Whether or not the returned `EntityCommands` should be unique. Defaults to false.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(unique: boolean = false): EntityCommands {
		const command = this.push(AddComponentCommand, Entity.size);
		const entityId = this.#entities.getId();
		command.entityId = entityId;
		command.componentId = 0;
		Memory.views.u64[command.dataStart >> 3] = entityId;
		return this.getById(entityId, unique);
	}

	/**
	 * Queues the provided entity to be despawned.
	 * @param entity The Entity to be despawned.
	 */
	despawn(entity: Entity): void {
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
	}

	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param entityId The id of the Entity to get.
	 * @param unique (optional) Whether or not the returned `EntityCommands` should be unique. Defaults to false.
	 * @returns `EntityCommands` for the provided entity.
	 */
	get(entity: Entity, unique: boolean = false): EntityCommands {
		return this.getById(entity.id, unique);
	}

	/**
	 * Gets `EntityCommands` given an Entity's id.
	 * @param entityId The id of the Entity to get.
	 * @param unique (optional) Whether or not the returned `EntityCommands` should be unique. Defaults to false.
	 * @returns `EntityCommands` for the provided entity.
	 */
	getById(entityId: bigint, unique: boolean = false): EntityCommands {
		return unique
			? new EntityCommands(
					this.#world,
					entityId,
					this.#initialValuePointers,
			  )
			: this.#entityCommands.setId(entityId);
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
		const { u32 } = Memory.views;
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
		const { u32 } = Memory.views;
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
		const { u32 } = Memory.views;
		const queueDataLength = 1 + u32[this.#pointer] * 3;
		for (
			let queueOffset = 1;
			queueOffset < queueDataLength;
			queueOffset += 3
		) {
			u32[this.#pointer + queueOffset] = 0;
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world');
	const { struct } = await import('../struct');

	beforeEach(() => {
		Memory.init(10_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	class ZST {
		static copy() {}
		static size = 0;
		static alignment = 1;
	}
	class Struct {
		static copy() {}
		static size = 1;
		static alignment = 1;
		constructor() {
			initStruct(this);
		}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	@struct
	class CompD {
		declare static size: number;
		@struct.u32 declare x: number;
		@struct.u32 declare y: number;

		declare __$$b: number;

		constructor(x = 23, y = 42) {
			initStruct(this);
			this.x = x;
			this.y = y;
		}
	}
	@struct
	class StringComponent {
		declare static size: number;
		declare static alignment: number;
		@struct.string declare value: string;
		constructor(str = 'hi') {
			initStruct(this);
			this.value = str;
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

	it('returns unique entity handles', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.getById(0n);
		const e2 = commands.getById(1n);
		expect(e1).not.toBe(e2);
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
			const u32 = Memory.views.u32.subarray(
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
			const u32 = Memory.views.u32.subarray(
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
		const { u32 } = Memory.views;
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
		const { u16, u32 } = Memory.views;

		for (const command of commands) {
			if (!(command instanceof AddComponentCommand)) {
				continue;
			}
			const { componentId, dataStart } = command;
			if (componentId === 6) {
				expect(
					Memory.views.u32[((component as any).__$$b + 8) >> 2],
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
