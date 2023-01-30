import { alignTo8 } from '../utils/alignTo8';
import { Entity, type Entities } from '../storage';
import type { Struct, StructStore } from '../struct';
import type { World } from './World';

type NotFunction<T> = T extends Function ? never : T;

export class Commands {
	static fromWorld(world: World) {
		const initialValues = world.threads.queue(() => {
			const size = world.components.reduce(
				(acc, val) => acc + val.size!,
				0,
			);
			const data = new Uint8Array(world.createBuffer(size));
			let offset = 0;
			for (const component of world.components) {
				if (component.size === 0) {
					continue;
				}
				const instance = new component() as { __$$s: StructStore };
				data.set(instance.__$$s.u8, offset);
				offset += component.size!;
			}
			return data;
		});
		const initialValueOffsets = world.threads.queue(() => {
			let offset = 0;
			return world.components.map(comp => {
				const val = offset;
				offset += comp.size!;
				return val;
			});
		});
		return new this(world, initialValues, initialValueOffsets);
	}

	#queue = new Map<bigint, bigint>(); // Map<eid, tableid>
	#usedData = 0;
	#queueData: Uint8Array;
	#queueView: DataView;

	#entities: Entities;
	#components: Struct[];

	#world: World;
	#initialValues: Uint8Array;
	#initialValuesOffset: number[];

	constructor(world: World, initial: Uint8Array, offsets: number[]) {
		this.#world = world;
		this.#initialValues = initial;
		this.#initialValuesOffset = offsets;

		const buffer = world.createBuffer(64);
		this.#queueData = new Uint8Array(buffer);
		this.#queueView = new DataView(buffer);
		this.#entities = world.entities;
		this.#components = world.components;
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

	getData(): [Map<bigint, bigint>, Uint8Array, DataView] {
		return [
			this.#queue,
			this.#queueData.subarray(0, this.#usedData),
			this.#queueView,
		];
	}
	reset() {
		this.#queue.clear();
		this.#queueData.fill(0);
		this.#usedData = 0;
	}

	insertInto<T extends object>(entityId: bigint, component: NotFunction<T>) {
		const componentType: Struct = component.constructor as any;
		this.#insert(entityId, componentType);
		this.#queueData.set(
			//@ts-ignore
			component.__$$s.u8.subarray(component.__$$b, componentType.size),
			this.#usedData,
		);
		this.#usedData += alignTo8(componentType.size!);
	}
	insertTypeInto(entityId: bigint, componentType: Struct) {
		this.#insert(entityId, componentType);
		if (componentType.size === 0 || componentType === Entity) {
			return;
		}
		const offset =
			this.#initialValuesOffset[this.#components.indexOf(componentType)];
		this.#queueData.set(
			this.#initialValues.subarray(offset, offset + componentType.size!),
			this.#usedData,
		);
		this.#usedData += alignTo8(componentType.size!);
	}
	#insert(entityId: bigint, componentType: Struct) {
		if (
			this.#usedData + componentType.size! + 16 >
			this.#queueData.byteLength
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

		this.#queueView.setBigUint64(this.#usedData, entityId);
		this.#queueView.setUint32(
			this.#usedData + 8,
			this.#components.indexOf(componentType),
		);
		this.#usedData += 16;
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
		const doubledLength = this.#queueData.byteLength * 2;
		const newLength =
			doubledLength > this.#usedData + minimumAdditional
				? doubledLength
				: alignTo8(doubledLength + minimumAdditional);
		const oldData = this.#queueData;
		const buffer = this.#world.createBuffer(newLength);
		this.#queueData = new Uint8Array(buffer);
		this.#queueData.set(oldData);
		this.#queueView = new DataView(buffer);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world');
	const { ThreadGroup } = await import('../threads/ThreadGroup');
	ThreadGroup.isMainThread = true;

	class ZST {
		static size = 0;
		static alignment = 1;
		static schema = 0;
	}
	class Struct {
		static size = 1;
		static alignment = 1;
		static schema = 0;
		constructor() {
			initStruct(this);
		}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static schema = 0b1111_1111_1111;
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

	const createWorld = () =>
		World.new()
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
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
		const [map, , dataview] = commands.getData();
		const u32 = new Uint32Array(dataview.buffer);
		expect(map.get(ent.id)).toBe(0b0010_0001n);
		expect(dataview.getBigUint64(0)).toBe(ent.id);
		expect(dataview.getUint32(8)).toBe(5); // CompD -> 5
		expect(u32[16 >> 2]).toBe(23);
		expect(u32[20 >> 2]).toBe(42);
	});

	it('inserts sized types with specialized data', async () => {
		const world = await createWorld();
		const commands = Commands.fromWorld(world);
		const ent = commands.spawn().add(new CompD(15, 16));
		const [map, , dataview] = commands.getData();
		const u32 = new Uint32Array(dataview.buffer);
		expect(map.get(ent.id)).toBe(0b0010_0001n);
		expect(dataview.getBigUint64(0)).toBe(ent.id);
		expect(dataview.getUint32(8)).toBe(5); // CompD -> 5
		expect(u32[16 >> 2]).toBe(15);
		expect(u32[20 >> 2]).toBe(16);
	});
}
