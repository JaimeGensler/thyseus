import type { Class } from '../components';
import { Entity } from '../entities';
import type { World } from '../world';

import type { Commands } from './Commands';

export class AddComponentCommand {
	entity: Entity;
	component: object;
	constructor(entity: Entity, component: object) {
		this.entity = entity;
		this.component = component;
	}

	static iterate = handleComponentCommands;
}

export class RemoveComponentCommand {
	entity: Entity;
	componentType: Class;
	constructor(entity: Entity, componentType: Class) {
		this.entity = entity;
		this.componentType = componentType;
	}
	static iterate(commands: Commands, world: World) {}
}

const entityDestinations = new Map<number, bigint>();
function handleComponentCommands(commands: Commands, world: World) {
	const { entities, tables } = world;
	// Find where entities will end up
	entityDestinations.clear();
	for (const { index, component } of commands.iterate(AddComponentCommand)) {
		let val = entityDestinations.get(index);
		if (val === 0n) {
			continue;
		}
		val ??= entities.getArchetype(entityId);
		const componentId = world.getComponentId(
			component.constructor as Class,
		);
		entityDestinations.set(index, val | (1n << BigInt(componentId)));
	}
	for (const { entityId, componentType } of commands.iterate(
		RemoveComponentCommand,
	)) {
		let val = entityDestinations.get(entityId);
		if (val === 0n) {
			continue;
		}
		val ??= entities.getArchetype(entityId);
		const componentId = world.getComponentId(componentType);
		entityDestinations.set(entityId, val ^ (1n << BigInt(componentId)));
	}

	// Move entities to their final destination
	for (const [entityId, archetype] of entityDestinations) {
		world.moveEntity(entityId, archetype);
	}

	// Handle data insertion from adds
	for (const { entityId, component } of commands.iterate(
		AddComponentCommand,
	)) {
		const { row, tableId } = entities.getLocation(entityId);
		if (tableId === 0) {
			continue;
		}
		tables[tableId].copyComponentIntoRow(row, component);
	}
}
