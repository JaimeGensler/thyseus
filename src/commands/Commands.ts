import { DEV } from 'esm-env';
import { assert } from '../utils/assert';
import { alignTo8 } from '../utils/alignTo8';
import { memory } from '../utils/memory';
import { Entity, type Entities } from '../storage';
import type { Struct } from '../struct';
import type { World } from '../world';

type NotFunction<T> = T extends Function ? never : T;
type Command = { entityId: bigint; componentId: number; dataStart: number };

const ADD_COMPONENT_COMMAND = 0;
const REMOVE_COMPONENT_COMMAND = 1;

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
				memory.views.u8.set((new component() as any).__$$s.u8, pointer);
				pointer += component.size!;
			}
			return componentPointers;
		});
		const queuePointer = world.threads.queue(() =>
			memory.alloc((1 + 3 * world.config.threads) * 4),
		);
		return new this(world, initialValuePointers, queuePointer);
	}

	#command: Command = { entityId: 0n, componentId: 0, dataStart: 0 };
	#destinations: Map<bigint, bigint> = new Map();

	#entities: Entities;
	#components: Struct[];

	#initialValuePointers: number[];
	#pointer: number; // [nextId, ...[length, capacity, pointer]]
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

	get #length() {
		return memory.views.u32[this.#ownPointer];
	}
	set #length(val: number) {
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
	get #queueEnd() {
		return this.#queuePointer + this.#length;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns An `Entity` instance, to add/remove components from an entity.
	 */
	spawn(): Entity {
		const entityId = this.#entities.spawn();
		this.#pushCommand(ADD_COMPONENT_COMMAND, entityId, Entity);
		memory.views.u64[this.#queueEnd >> 3] = entityId;
		this.#length += 8;
		return new Entity(this, entityId);
	}

	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): void {
		this.#pushCommand(REMOVE_COMPONENT_COMMAND, id, Entity);
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns An `Entity` instance, to add/remove components from an entity.
	 */
	getEntityById(id: bigint): Entity {
		return new Entity(this, id);
	}

	insertInto<T extends object>(
		entityId: bigint,
		component: NotFunction<T>,
	): void {
		const componentType: Struct = component.constructor as any;
		if (DEV) {
			assert(
				componentType !== Entity,
				'Tried to add Entity component, which is forbidden.',
			);
		}
		this.#pushCommand(ADD_COMPONENT_COMMAND, entityId, componentType);
		if (componentType.size === 0) {
			return;
		}
		memory.views.u8.set(
			(component as any).__$$s.u8.subarray(
				(component as any).__$$b,
				componentType.size,
			),
			this.#queueEnd,
		);
		this.#copyPointers(componentType);
		this.#length += alignTo8(componentType.size!);
	}

	insertTypeInto(entityId: bigint, componentType: Struct): void {
		if (DEV) {
			assert(
				componentType !== Entity,
				'Tried to add Entity component, which is forbidden.',
			);
		}
		this.#pushCommand(ADD_COMPONENT_COMMAND, entityId, componentType);
		if (componentType.size === 0) {
			return;
		}
		memory.copy(
			this.#initialValuePointers[this.#components.indexOf(componentType)],
			componentType.size!,
			this.#queueEnd,
		);
		this.#copyPointers(componentType);
		this.#length += alignTo8(componentType.size!);
	}

	removeFrom(entityId: bigint, componentType: Struct): void {
		if (DEV) {
			assert(
				componentType !== Entity,
				'Tried to remove Entity component, which is forbidden.',
			);
		}
		this.#pushCommand(REMOVE_COMPONENT_COMMAND, entityId, componentType);
	}

	getDestinations(): Map<bigint, bigint> {
		this.#destinations.clear();
		const { u8, u16, u64 } = memory.views;
		for (const current of this.#iterateCommands()) {
			const entityId = u64[(current + 8) >> 3];
			let val = this.#destinations.get(entityId);
			if (val === 0n) {
				continue;
			}
			const componentId = u16[(current + 4) >> 1];
			const isAdd = u8[current + 6] === ADD_COMPONENT_COMMAND;
			val ??= this.#entities.getBitset(entityId);
			this.#destinations.set(
				entityId,
				isAdd
					? val | (1n << BigInt(componentId))
					: componentId === 0
					? 0n
					: val ^ (1n << BigInt(componentId)),
			);
		}
		return this.#destinations;
	}

	*[Symbol.iterator]() {
		const { u16, u32, u64 } = memory.views;
		for (const current of this.#iterateCommands()) {
			if (u32[current >> 2] === 16) {
				continue;
			}
			this.#command.componentId = u16[(current + 4) >> 1];
			this.#command.entityId = u64[(current + 8) >> 3];
			this.#command.dataStart = current + 16;
			yield this.#command;
		}
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

	*#iterateCommands() {
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
				yield current;
			}
		}
	}

	#pushCommand(
		commandType:
			| typeof ADD_COMPONENT_COMMAND
			| typeof REMOVE_COMPONENT_COMMAND,
		entityId: bigint,
		componentType: Struct,
	) {
		if (DEV) {
			assert(
				this.#components.includes(componentType),
				`Tried to ${commandType} unregistered component (${componentType.name}) on an Entity.`,
			);
		}
		const additionalLength = alignTo8(
			16 +
				(commandType === ADD_COMPONENT_COMMAND
					? componentType.size!
					: 0),
		);
		if (this.#capacity < this.#length + additionalLength) {
			const newLength = (this.#length + additionalLength) * 2;
			this.#capacity = newLength;
			this.#queuePointer = memory.realloc(this.#queuePointer, newLength);
		}
		const queueEnd = this.#queueEnd;
		memory.views.u32[queueEnd >> 2] = additionalLength;
		memory.views.u16[(queueEnd + 4) >> 1] =
			this.#components.indexOf(componentType);
		memory.views.u8[queueEnd + 6] = commandType;
		memory.views.u64[(queueEnd + 8) >> 3] = entityId;
		this.#length += 16;
	}
	#copyPointers(componentType: Struct) {
		const queueEnd = this.#queueEnd;
		for (const pointer of componentType.pointers! ?? []) {
			memory.views.u32[(queueEnd + pointer) >> 2] = memory.copyPointer(
				memory.views.u32[(queueEnd + pointer) >> 2],
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
	const { ThreadGroup } = await import('../threads/ThreadGroup');
	const { struct } = await import('../struct');
	ThreadGroup.isMainThread = true;

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

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

		declare __$$s: any;
		set x(val: number) {
			this.__$$s.u32[0] = val;
		}
		set y(val: number) {
			this.__$$s.u32[1] = val;
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
		declare __$$s: any;
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

	it('returns unique entity handles', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const e1 = commands.getEntityById(0n);
		const e2 = commands.getEntityById(1n);
		expect(e1).not.toBe(e2);
	});

	it('adds Entity component to spawned entities', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn();
		const map = commands.getDestinations();
		expect(map.has(ent.id)).toBe(true);
		expect(map.get(ent.id)).toBe(0b1n); // Just Entity
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST);
		const map = commands.getDestinations();
		expect(map.get(ent.id)).toBe(0b11n); // Entity, ZST
	});

	it('removes components', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST).remove(ZST);
		const map = commands.getDestinations();
		expect(map.get(ent.id)).toBe(0b01n); // Entity
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST);
		ent.despawn();
		const map = commands.getDestinations();
		expect(map.get(ent.id)).toBe(0n);
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(CompD);
		let i = 0;
		for (const { componentId, entityId, dataStart } of commands) {
			if (i !== 0) {
				expect(entityId).toBe(ent.id);
				const u32 = memory.views.u32.subarray(
					dataStart >> 2,
					(dataStart + CompD.size) >> 2,
				);
				expect(componentId).toBe(5);
				expect(u32[0]).toBe(23);
				expect(u32[1]).toBe(42);
			}
			i++;
		}
	});

	it('inserts sized types with specified data', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().add(new CompD(15, 16));
		let i = 0;
		for (const { componentId, entityId, dataStart } of commands) {
			if (i !== 0) {
				expect(entityId).toBe(ent.id);
				const u32 = memory.views.u32.subarray(
					dataStart >> 2,
					(dataStart + CompD.size) >> 2,
				);
				expect(componentId).toBe(5);
				expect(u32[0]).toBe(15);
				expect(u32[1]).toBe(16);
			}
			i++;
		}
	});

	it('copies pointers for default values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent1 = commands.spawn().addType(StringComponent);
		const ent2 = commands.spawn().addType(StringComponent);
		const { u32 } = memory.views;
		let previousPointer = 0;
		for (const { componentId, dataStart } of commands) {
			if (componentId === 6) {
				expect(u32[(dataStart + 8) >> 2]).not.toBe(previousPointer);
				previousPointer = u32[(dataStart + 8) >> 2];
			}
		}
	});

	it('copies pointers for passed values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const component = new StringComponent('test');
		const ent = commands.spawn().add(component);
		const { u32 } = memory.views;

		for (const { componentId, dataStart } of commands) {
			if (componentId === 6) {
				expect(component.__$$s.u32[2]).not.toBe(
					u32[(dataStart + 8) >> 2],
				);
			}
		}
	});

	it('throws if trying to add/remove Entity', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		expect(() => commands.insertTypeInto(0n, Entity)).toThrow();
		expect(() =>
			commands.insertInto(0n, new Entity(commands, 1n)),
		).toThrow();
		expect(() => commands.removeFrom(0n, Entity)).toThrow();
	});

	it('reset clears all queues', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(CompA);
		commands.reset();
		let iterations = 0;
		for (const command of commands) {
			iterations++;
		}
		expect(iterations).toBe(0);
	});

	it('iterate skips ZSTs', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST);
		let iterations = 0;
		for (const { componentId } of commands) {
			expect(componentId).toBe(0);
			iterations++;
		}
		expect(iterations).toBe(1);
	});
}
