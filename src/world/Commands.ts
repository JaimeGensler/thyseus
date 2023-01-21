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
		this.#queueData = new Uint8Array(world.createBuffer(64));
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
			component.__$$s.u8.slice(component.__$$b, componentType.size),
			this.#usedData,
		);
		this.#usedData += componentType.size!;
	}
	insertTypeInto(entityId: bigint, componentType: Struct) {
		this.#insert(entityId, componentType);
		if (componentType.size === 0) {
			return;
		}
		this.#queueData.set(
			this.#initialValues.slice(
				this.#initialValuesOffset[
					this.#components.indexOf(componentType)
				],
				componentType.size!,
			),
			this.#usedData,
		);
		this.#usedData += componentType.size!;
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
		if (componentType.size === 0) {
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
				: Math.ceil((doubledLength + minimumAdditional) * 8) / 8;
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
	const { describe, it, expect } = import.meta.vitest;

	it('works');
}
