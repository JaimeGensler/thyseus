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

	queue = new Map<bigint, bigint>(); // Map<eid, tableid>
	#usedData = 0;
	queueData: Uint8Array;

	#entities: Entities;
	#components: Struct[];

	#world: World;
	#initialValues: Uint8Array;
	#initialValuesOffset: number[];

	constructor(world: World, initial: Uint8Array, offsets: number[]) {
		this.#world = world;
		this.#initialValues = initial;
		this.#initialValuesOffset = offsets;

		this.queueData = new Uint8Array(world.createBuffer(8));
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
		this.queue.set(id, 0n);
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

	reset() {
		this.queue.clear();
		this.queueData.fill(0);
		this.#usedData = 0;
	}

	insertInto<T extends object>(entityId: bigint, component: NotFunction<T>) {
		const componentType: Struct = component.constructor as any;
		this.#insert(entityId, componentType);
		this.queueData.set(
			//@ts-ignore
			component.__$$s.u8.slice(component.__$$b, componentType),
			this.#usedData,
		);
		this.#usedData += componentType.size!;
	}
	insertTypeInto(entityId: bigint, componentType: Struct) {
		this.#insert(entityId, componentType);
		this.queueData.set(
			this.#initialValues.slice(
				this.#initialValuesOffset[
					this.#components.indexOf(componentType)
				],
				componentType.size!,
			),
		);
		this.#usedData += componentType.size!;
	}
	#insert(entityId: bigint, componentType: Struct) {
		if (this.#usedData + componentType.size! > this.queueData.byteLength) {
			this.#growQueueData();
		}
		this.queue.set(
			entityId,
			this.#getBitset(entityId) | this.#getComponentId(componentType),
		);
	}

	removeFrom(entityId: bigint, componentType: Struct) {
		this.queue.set(
			entityId,
			this.#getBitset(entityId) ^ this.#getComponentId(componentType),
		);
	}

	#getBitset(entityId: bigint) {
		return (
			this.queue.get(entityId) ??
			this.#world.archetypes[this.#entities.getTableIndex(entityId)]
				.bitfield
		);
	}
	#getComponentId(component: Struct) {
		return 1n << BigInt(this.#components.indexOf(component));
	}
	#growQueueData() {
		const newLength = this.queueData.byteLength * 2;
		const oldData = this.queueData;
		this.queueData = new Uint8Array(this.#world.createBuffer(newLength));
		this.queueData.set(oldData);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	it('works');
}
