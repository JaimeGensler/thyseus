import { alignTo8 } from '../utils/alignTo8';
import { memory, type MemoryViews } from '../utils/memory';
import { Entity, type Entities } from '../storage';
import type { Struct } from '../struct';
import type { World } from './World';

type NotFunction<T> = T extends Function ? never : T;

export class Commands {
	static fromWorld(world: World) {
		const initialValuePtr = world.threads.queue(() => {
			const size = world.components.reduce(
				(acc, val) => acc + val.size!,
				0,
			);
			const ptr = memory.alloc(size);
			let offset = 0;
			for (const component of world.components) {
				if (component.size === 0) {
					continue;
				}
				const instance = new component() as { __$$s: MemoryViews };
				memory.views.u8.set(instance.__$$s.u8, ptr + offset);
				offset += component.size!;
			}
			return ptr;
		});
		const initialValueOffsets = world.threads.queue(() => {
			let offset = 0;
			return world.components.map(comp => {
				const val = offset;
				offset += comp.size!;
				return val;
			});
		});
		return new this(world, initialValuePtr, initialValueOffsets);
	}

	#queue = new Map<bigint, bigint>(); // Map<eid, tableid>
	#queuePointer: number;
	#queueLength = 0;
	#queueCapacity: number;

	#entities: Entities;
	#components: Struct[];

	#world: World;
	#initialValuePointer: number;
	#initialValuesOffset: number[];

	constructor(world: World, initialValuePointer: number, offsets: number[]) {
		this.#world = world;
		this.#initialValuePointer = initialValuePointer;
		this.#initialValuesOffset = offsets;

		this.#entities = world.entities;
		this.#components = world.components;
		this.#queuePointer = memory.alloc(64);
		this.#queueCapacity = 64;
	}

	/**
	 * Queues an entity to be spawned.
	 * @returns An `Entity` instance, to add/remove components from an entity.
	 */
	spawn(): Entity {
		const entity = new Entity(this, this.#entities.spawn());
		this.insertTypeInto(entity.id, Entity);
		return entity;
	}

	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): this {
		this.#queue.set(id, 0n);
		return this;
	}

	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns An `Entity` instance, to add/remove components from an entity.
	 */
	get(id: bigint): Entity {
		return new Entity(this, id);
	}

	getData(): [Map<bigint, bigint>, number, number] {
		return [this.#queue, this.#queuePointer, this.#queueLength];
	}
	reset() {
		this.#queue.clear();
		memory.set(this.#queuePointer, this.#queueLength, 0);
		this.#queueLength = 0;
	}

	insertInto<T extends object>(entityId: bigint, component: NotFunction<T>) {
		const componentType: Struct = component.constructor as any;
		this.#insert(entityId, componentType);
		memory.views.u8.set(
			(component as any).__$$s.u8.subarray(
				(component as any).__$$b,
				componentType.size,
			),
			this.#queuePointer + this.#queueLength,
		);

		const queueEnd = this.#queuePointer + this.#queueLength;
		for (const pointer of componentType.pointers! ?? []) {
			const pointerIndex = ((component as any).__$$b + pointer) >> 2;
			memory.views.u32[(queueEnd + pointer) >> 2] = memory.copyPointer(
				(component as any).__$$s.u32[pointerIndex],
			);
		}
		this.#queueLength += alignTo8(componentType.size!);
	}
	insertTypeInto(entityId: bigint, componentType: Struct) {
		this.#insert(entityId, componentType);
		if (componentType.size === 0 || componentType === Entity) {
			return;
		}
		const offset =
			this.#initialValuePointer +
			this.#initialValuesOffset[this.#components.indexOf(componentType)];

		const queueEnd = this.#queuePointer + this.#queueLength;
		memory.copy(offset, componentType.size!, queueEnd);

		for (const pointer of componentType.pointers! ?? []) {
			memory.views.u32[(queueEnd + pointer) >> 2] = memory.copyPointer(
				memory.views.u32[(queueEnd + pointer) >> 2],
			);
		}
		this.#queueLength += alignTo8(componentType.size!);
	}
	#insert(entityId: bigint, componentType: Struct) {
		if (
			this.#queueLength + componentType.size! + 16 >
			this.#queueCapacity
		) {
			this.#growQueueData(componentType.size!);
		}
		this.#queue.set(
			entityId,
			this.#getBitset(entityId) | this.#getComponentId(componentType),
		);
		if (componentType.size === 0 || componentType === Entity) {
			return;
		}

		memory.views.u64[(this.#queuePointer + this.#queueLength) >> 3] =
			entityId;
		memory.views.u32[(this.#queuePointer + this.#queueLength + 8) >> 2] =
			this.#components.indexOf(componentType);
		this.#queueLength += 16;
	}

	removeFrom(entityId: bigint, componentType: Struct) {
		this.#queue.set(
			entityId,
			this.#getBitset(entityId) ^ this.#getComponentId(componentType),
		);
	}

	#getBitset(entityId: bigint) {
		return (
			this.#queue.get(entityId) ??
			this.#world.archetypes[this.#entities.getTableIndex(entityId)]
				.bitfield
		);
	}
	#getComponentId(component: Struct) {
		return 1n << BigInt(this.#components.indexOf(component));
	}
	#growQueueData(minimumAdditional: number) {
		minimumAdditional += 16;
		const doubledLength = this.#queueCapacity * 2;
		const newLength =
			doubledLength > this.#queueLength + minimumAdditional
				? doubledLength
				: alignTo8(doubledLength + minimumAdditional);
		this.#queuePointer = memory.realloc(this.#queuePointer, newLength);
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
		const e1 = commands.get(0n);
		const e2 = commands.get(1n);
		expect(e1).not.toBe(e2);
	});

	it('adds Entity component to spawned entities', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn();
		const [map] = commands.getData();
		expect(map.has(ent.id)).toBe(true);
		expect(map.get(ent.id)).toBe(0b1n); // Just Entity
	});

	it('inserts ZSTs', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST);
		const [map] = commands.getData();
		expect(map.get(ent.id)).toBe(0b11n); // Entity, ZST
	});

	it('removes components', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST).remove(ZST);
		const [map] = commands.getData();
		expect(map.get(ent.id)).toBe(0b01n); // Entity
	});

	it('despawns entities', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(ZST);
		ent.despawn();
		const [map] = commands.getData();
		expect(map.get(ent.id)).toBe(0n);
	});

	it('inserts sized types with default data', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().addType(CompD);
		const [map, start, length] = commands.getData();
		const u32 = new Uint32Array(memory.views.buffer, start, length / 4);

		expect(map.get(ent.id)).toBe(0b0010_0001n);
		expect(memory.views.u64[start >> 3]).toBe(ent.id);
		expect(memory.views.u32[(start >> 2) + 2]).toBe(5); // CompD -> 5
		expect(u32[16 >> 2]).toBe(23);
		expect(u32[20 >> 2]).toBe(42);
	});

	it('inserts sized types with specified data', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().add(new CompD(15, 16));
		const [map, start, length] = commands.getData();
		const u32 = new Uint32Array(memory.views.buffer, start, length / 4);
		expect(map.get(ent.id)).toBe(0b0010_0001n);
		expect(memory.views.u64[start >> 3]).toBe(ent.id);
		expect(memory.views.u32[(start >> 2) + 2]).toBe(5); // CompD -> 5
		expect(u32[16 >> 2]).toBe(15);
		expect(u32[20 >> 2]).toBe(16);
	});

	it('copies pointers for default values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent1 = commands.spawn().addType(StringComponent);
		const ent2 = commands.spawn().addType(StringComponent);
		const [, start] = commands.getData();
		let offset = 0;
		expect(memory.views.u64[(start + offset) >> 3]).toBe(ent1.id);
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(6); // StringComp -> 5
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2); // length
		offset += 4;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2); // capacity
		offset += 4;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2544); // pointer
		offset += 8;
		expect(memory.views.u64[(start + offset) >> 3]).toBe(ent2.id);
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(6); // StringComp -> 5
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2); // length
		offset += 4;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2); // capacity
		offset += 4;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(2568); // pointer
	});

	it('copies pointers for passed values', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const component = new StringComponent('test');
		const ent = commands.spawn().add(component);
		const [, start] = commands.getData();
		let offset = 0;
		expect(memory.views.u64[(start + offset) >> 3]).toBe(ent.id);
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(6); // StringComp -> 5
		offset += 8;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(4); // length
		offset += 4;
		expect(memory.views.u32[(start + offset) >> 2]).toBe(4); // capacity
		expect(component.__$$s.u32[2]).not.toBe(
			memory.views.u32[(start + offset) >> 2],
		);
	});
}
