import type { Class } from '../components';
import { Entity } from '../entities';
import type { World } from '../world';

export class EntityCommandQueue {
	#world: World;
	#destinations: Map<Entity, bigint>;
	#inserts: Map<Entity, object[]>;

	constructor(world: World) {
		this.#world = world;
		this.#destinations = new Map();
		this.#inserts = new Map();
	}

	spawn(entity: Entity) {
		this.addType(entity, Entity);
	}
	despawn(entity: Entity) {
		this.#destinations.set(entity, 0n);
	}
	add(entity: Entity, instance: object) {
		const type = instance.constructor as Class;
		this.addType(entity, type);
		const inserts = this.#inserts.get(entity) ?? [];
		inserts.push(instance);
		this.#inserts.set(entity, inserts);
	}
	addType(entity: Entity, type: Class) {
		let val = this.#destinations.get(entity);
		if (val === 0n) {
			return;
		}
		val ??= this.#world.entities.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val | (1n << BigInt(componentId)));
	}
	remove(entity: Entity, type: Class) {
		let val = this.#destinations.get(entity);
		if (val === 0n) {
			return;
		}
		val ??= this.#world.entities.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val ^ (1n << BigInt(componentId)));
	}

	apply(world: World) {
		const { entities, tables } = world;
		for (const [entity, archetype] of this.#destinations) {
			world.moveEntity(entity, archetype);
		}
		// Handle data insertion from adds
		for (const [entity, components] of this.#inserts) {
			const [tableId, row] = entities.getLocation(entity);
			if (tableId === 0) {
				continue;
			}
			for (const component of components) {
				tables[tableId].copyComponentIntoRow(row, component);
			}
		}
		this.#destinations.clear();
		this.#inserts.clear();
	}
}
