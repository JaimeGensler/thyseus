import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { alignTo8 } from '../utils/alignTo8';
import { memory } from '../utils/memory';
import { EntityCommands } from './EntityCommands';
import { Entity, type Entities } from '../storage';
import type { Struct } from '../struct';
import type { World } from '../world';

type NotFunction<T> = T extends Function ? never : T;
type Command = { type: number; dataStart: number; dataSize: number };

export const REMOVE_COMPONENT_COMMAND = 0;
export const ADD_COMPONENT_COMMAND = 1;
export const CLEAR_QUEUE_COMMAND = 2;

export class Commands {
	static fromWorld(world: World) {
		const initialValuePointers = world.threads.queue(() => {
			const size = world.components.reduce(
				(acc, val) => acc + val.size!,
				0,
			);
			const componentPointers = [];
			let pointer = memory.alloc(size);
			for (const component of world.components) {
				componentPointers.push(pointer);
				if (component.size === 0) {
					continue;
				}
				const instance = new component() as { __$$b: number };
				memory.copy(instance.__$$b, component.size!, pointer);
				memory.free(instance.__$$b);
				pointer += component.size!;
			}
			return componentPointers;
		});
		const dataPointer = world.threads.queue(() =>
			memory.alloc((1 + 3 * world.config.threads) * 4),
		);
		return new this(world, initialValuePointers, dataPointer);
	}

	#command: Command = { type: 0, dataStart: 0, dataSize: 0 };

	#entities: Entities;
	#components: Struct[];

	#initialValuePointers: number[];
	#pointer: number; // [nextId, ...[size, capacity, pointer]]
	#ownPointer: number;
	constructor(world: World, initialValuePointers: number[], pointer: number) {
		this.#entities = world.entities;
		this.#components = world.components;

		this.#initialValuePointers = initialValuePointers;
		this.#pointer = pointer >> 2;
		this.#ownPointer =
			3 * Atomics.add(memory.views.u32, this.#pointer, 1) +
			this.#pointer +
			1;
	}

	get #size() {
		return memory.views.u32[this.#ownPointer];
	}
	set #size(val: number) {
		memory.views.u32[this.#ownPointer] = val;
	}
	get #capacity() {
		return memory.views.u32[this.#ownPointer + 1];
	}
	set #capacity(val: number) {
		memory.views.u32[this.#ownPointer + 1] = val;
	}
	get #queuePointer() {
		return memory.views.u32[this.#ownPointer + 2];
	}
	set #queuePointer(val: number) {
		memory.views.u32[this.#ownPointer + 2] = val;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	spawn(): EntityCommands {
		const entityId = this.#entities.spawn();
		const dataStart = this.#pushComponentCommand(
			ADD_COMPONENT_COMMAND,
			entityId,
			Entity,
		);
		memory.views.u64[dataStart >> 3] = entityId;
		return new EntityCommands(this, entityId);
	}

	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): void {
		this.#pushComponentCommand(REMOVE_COMPONENT_COMMAND, id, Entity);
	}

	/**
	 * Gets `EntityCommands` for an Entity.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands`, which can add/remove components from an entity.
	 */
	getEntityById(id: bigint): EntityCommands {
		return new EntityCommands(this, id);
	}

	insertInto<T extends object>(
		entityId: bigint,
		component: NotFunction<T>,
	): void {
		const componentType: Struct = component.constructor as any;

		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);

		const dataStart = this.#pushComponentCommand(
			ADD_COMPONENT_COMMAND,
			entityId,
			componentType,
		);
		if (componentType.size === 0) {
			return;
		}
		memory.copy((component as any).__$$b, componentType.size!, dataStart);
		this.#copyPointers(componentType, dataStart);
	}

	insertTypeInto(entityId: bigint, componentType: Struct): void {
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to add Entity component, which is forbidden.',
		);

		const dataStart = this.#pushComponentCommand(
			ADD_COMPONENT_COMMAND,
			entityId,
			componentType,
		);

		if (componentType.size === 0) {
			return;
		}
		memory.copy(
			this.#initialValuePointers[this.#components.indexOf(componentType)],
			componentType.size!,
			dataStart,
		);
		this.#copyPointers(componentType, dataStart);
	}

	removeFrom(entityId: bigint, componentType: Struct): void {
		DEV_ASSERT(
			componentType !== Entity,
			'Tried to remove Entity component, which is forbidden.',
		);

		this.#pushComponentCommand(
			REMOVE_COMPONENT_COMMAND,
			entityId,
			componentType,
		);
	}

	*[Symbol.iterator]() {
		const { u32 } = memory.views;
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
				this.#command.type = u32[(current + 4) >> 2];
				this.#command.dataSize = u32[current >> 2] - 8;
				this.#command.dataStart = current + 8;
				yield this.#command;
			}
		}
	}

	pushCommand(size: number, type: number): number {
		const addedSize = 8 + alignTo8(size);
		let newSize = this.#size + addedSize;
		if (this.#capacity < newSize) {
			newSize <<= 1; // Double new size
			this.#queuePointer = memory.realloc(this.#queuePointer, newSize);
			this.#capacity = newSize;
		}
		const queueEnd = this.#queuePointer + this.#size;
		memory.views.u32[queueEnd >> 2] = addedSize;
		memory.views.u32[(queueEnd + 4) >> 2] = type;
		this.#size += addedSize;
		return queueEnd + 8;
	}

	reset(): void {
		const { u32 } = memory.views;
		const queueDataLength = 1 + u32[this.#pointer] * 3;
		for (
			let queueOffset = 1;
			queueOffset < queueDataLength;
			queueOffset += 3
		) {
			u32[this.#pointer + queueOffset] = 0;
		}
	}

	#pushComponentCommand(
		commandType: 0 | 1,
		entityId: bigint,
		componentType: Struct,
	): number {
		DEV_ASSERT(
			this.#components.includes(componentType),
			`Tried to add/remove unregistered component (${componentType.name}) on an Entity.`,
		);

		const pointer = this.pushCommand(
			16 + alignTo8(commandType * componentType.size!),
			commandType,
		);
		memory.views.u64[pointer >> 3] = entityId;
		memory.views.u16[(pointer + 8) >> 1] =
			this.#components.indexOf(componentType);
		return pointer + 16;
	}
	#copyPointers(componentType: Struct, dataStart: number) {
		for (const pointer of componentType.pointers! ?? []) {
			memory.views.u32[(dataStart + pointer) >> 2] = memory.copyPointer(
				memory.views.u32[(dataStart + pointer) >> 2],
			);
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
	const { ThreadGroup } = await import('../threads');
	const { struct } = await import('../struct');
	ThreadGroup.isMainThread = true;

	beforeEach(() => {
		memory.init(10_000);
		return () => memory.UNSAFE_CLEAR_ALL();
	});

	class ZST {
		static size = 0;
		static alignment = 1;
	}
	class Struct {
		static size = 1;
		static alignment = 1;
		constructor() {
			initStruct(this);
		}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static size = 8;
		static alignment = 4;

		declare __$$b: number;
		set x(val: number) {
			memory.views.u32[this.__$$b >> 2] = val;
		}
		set y(val: number) {
			memory.views.u32[(this.__$$b + 4) >> 2] = val;
		}

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
		World.new()
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
			.registerComponent(StringComponent)
			.build();

	const getDestinations = (world: World) => {
		const entityDestinations = new Map();
		for (const { type, dataStart } of world.commands) {
			if (
				type !== ADD_COMPONENT_COMMAND &&
				type !== REMOVE_COMPONENT_COMMAND
			) {
				continue;
			}
			const entityId = memory.views.u64[dataStart >> 3];
			let val = entityDestinations.get(entityId);
			if (val === 0n) {
				continue;
			}
			const componentId = memory.views.u16[(dataStart + 8) >> 1];
			val ??= world.entities.getBitset(entityId);
			entityDestinations.set(
				entityId,
				type === ADD_COMPONENT_COMMAND
					? val | (1n << BigInt(componentId))
					: componentId === 0
					? 0n
					: val ^ (1n << BigInt(componentId)),
			);
		}
		return entityDestinations;
	};

	it('returns unique entity handles', async () => {
		const world = await createWorld();
		const { commands } = world;
		const e1 = commands.getEntityById(0n);
		const e2 = commands.getEntityById(1n);
		expect(e1).not.toBe(e2);
	});

	it('adds Entity component to spawned entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn();
		const map = getDestinations(world);
		expect(map.has(ent.id)).toBe(true);
		expect(map.get(ent.id)).toBe(0b1n); // Just Entity
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		const map = getDestinations(world);
		expect(map.get(ent.id)).toBe(0b11n); // Entity, ZST
	});

	it('removes components', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST).remove(ZST);
		const map = getDestinations(world);
		expect(map.get(ent.id)).toBe(0b01n); // Entity
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(ZST);
		ent.despawn();
		const map = getDestinations(world);
		expect(map.get(ent.id)).toBe(0n);
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(CompD);
		let i = 0;
		for (const { dataStart } of commands) {
			if (i !== 0) {
				const entityId = memory.views.u64[dataStart >> 3];
				expect(entityId).toBe(ent.id);
				const u32 = memory.views.u32.subarray(
					(dataStart + 16) >> 2,
					(dataStart + 16 + CompD.size) >> 2,
				);
				const componentId = memory.views.u16[(dataStart + 8) >> 1];
				expect(componentId).toBe(5);
				expect(u32[0]).toBe(23);
				expect(u32[1]).toBe(42);
			}
			i++;
		}
	});

	it('inserts sized types with specified data', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().add(new CompD(15, 16));
		let i = 0;
		for (const { dataStart } of commands) {
			if (i++ === 0) {
				continue;
			}

			const entityId = memory.views.u64[dataStart >> 3];
			expect(entityId).toBe(ent.id);
			const u32 = memory.views.u32.subarray(
				(dataStart + 16) >> 2,
				(dataStart + 16 + CompD.size) >> 2,
			);
			const componentId = memory.views.u16[(dataStart + 8) >> 1];
			expect(componentId).toBe(5);
			expect(u32[0]).toBe(15);
			expect(u32[1]).toBe(16);
		}
	});

	it('copies pointers for default values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent1 = commands.spawn().addType(StringComponent);
		const ent2 = commands.spawn().addType(StringComponent);
		const { u16, u32 } = memory.views;
		let previousPointer = 0;
		for (const { dataStart } of commands) {
			const componentId = u16[(dataStart + 8) >> 1];
			if (componentId === 6) {
				expect(u32[(dataStart + 24) >> 2]).not.toBe(previousPointer);
				previousPointer = u32[(dataStart + 24) >> 2];
			}
		}
	});

	it('copies pointers for passed values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const component = new StringComponent('test');
		const ent = commands.spawn().add(component);
		const { u16, u32 } = memory.views;

		for (const { dataStart } of commands) {
			const componentId = u16[(dataStart + 8) >> 1];
			if (componentId === 6) {
				expect(
					memory.views.u32[((component as any).__$$b + 8) >> 2],
				).not.toBe(u32[(dataStart + 24) >> 2]);
			}
		}
	});

	it('throws if trying to add/remove Entity', async () => {
		const world = await createWorld();
		const { commands } = world;
		expect(() => commands.insertTypeInto(0n, Entity)).toThrow();
		expect(() =>
			commands.insertInto(0n, new Entity(commands, 1n)),
		).toThrow();
		expect(() => commands.removeFrom(0n, Entity)).toThrow();
	});

	it('reset clears all queues', async () => {
		const world = await createWorld();
		const { commands } = world;
		const ent = commands.spawn().addType(CompA);
		commands.reset();
		let iterations = 0;
		for (const command of commands) {
			iterations++;
		}
		expect(iterations).toBe(0);
	});
}
