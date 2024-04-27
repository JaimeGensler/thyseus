import { Class } from '../components';
import { World } from '../world';

import { Entity } from './Entity';

export class Entities {
	#nextId: number = 0;
	#destinations: Map<Readonly<Entity>, bigint> = new Map();
	#inserts: Map<Readonly<Entity>, object[]> = new Map();
	#EMPTY: [] = [];

	#world: World;
	constructor(world: World) {
		this.#world = world;
	}

	spawn(): Entity {
		const entity = new Entity(this, this.#nextId++);
		this.#destinations.set(entity, 1n);
		this.#inserts.set(entity, [entity]);
		return entity;
	}
	add(entity: Readonly<Entity>, instance: object) {
		this.addType(entity, instance.constructor as Class);
		const inserts = this.#inserts.get(entity) ?? [];
		inserts.push(instance);
		this.#inserts.set(entity, inserts);
	}
	addType(entity: Readonly<Entity>, type: Class) {
		const val = this.#destinations.get(entity) ?? this.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val | (1n << BigInt(componentId)));
	}
	remove(entity: Readonly<Entity>, type: Class) {
		const val = this.#destinations.get(entity) ?? this.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val ^ (1n << BigInt(componentId)));
	}

	update() {
		const world = this.#world;
		for (const [entity, archetype] of this.#destinations) {
			const components = this.#inserts.get(entity) ?? this.#EMPTY;
			const [table, row] = entity.locate();
			const currentTable = world.tables[table];
			const targetTable = world.getTable(archetype);
			const backfilledEntity =
				currentTable.move(row, targetTable, components) ?? entity;
			backfilledEntity.move(table, row);
			entity.move(targetTable.id, targetTable.length - 1);
		}
		this.#destinations.clear();
		this.#inserts.clear();
	}

	getArchetype(entity: Readonly<Entity>): bigint {
		const [table] = entity.locate();
		return this.#world.tables[table].archetype;
	}

	hasComponent(entity: Readonly<Entity>, component: Class) {
		const componentId = this.#world.getComponentId(component);
		const archetype = this.getArchetype(entity);
		return (archetype & (1n << BigInt(componentId))) !== 0n;
	}
}
