import { Entity } from '../entities';
import type { Store } from '../storage';
import type { u64, u32, StructInstance } from '../struct';
import { alignTo8 } from '../utils';
import { World } from '../world';
import { Commands } from './Commands';

class BaseComponentCommand {
	static readonly size = 16; // Size is for struct internals, payload follows
	static readonly alignment = 8;
	deserialize(store: Store) {
		this.entityId = store.readU64();
		this.componentId = store.readU32();
		store.offset += 4;
	}
	serialize(store: Store) {
		store.writeU64(this.entityId);
		store.writeU32(this.componentId);
		store.offset += 4;
	}

	entityId: u64 = 0n;
	componentId: u32 = 0;
}

const entityDestinations = new Map<bigint, bigint>();
export class AddComponentCommand extends BaseComponentCommand {
	component: StructInstance = new Entity();
	store: Store | null = null;
	serialize(store: Store) {
		super.serialize(store);
		this.component.serialize!(store);
		store.offset = alignTo8(store.offset);
	}
	deserialize(store: Store) {
		super.deserialize(store);
		this.store = store;
		store.offset = alignTo8(store.offset);
	}

	static with(
		entityId: u64,
		componentId: u32,
		component: StructInstance,
	): AddComponentCommand {
		addComponent.entityId = entityId;
		addComponent.componentId = componentId;
		addComponent.component = component;
		return addComponent;
	}
	static iterate(commands: Commands, world: World) {
		const { entities, tables, components } = world;
		// Find where entities will end up
		entityDestinations.clear();
		for (const { entityId, componentId } of commands.iterate(
			AddComponentCommand,
		)) {
			let val = entityDestinations.get(entityId);
			if (val === 0n) {
				continue;
			}
			val ??= entities.getArchetype(entityId);
			entityDestinations.set(entityId, val | (1n << BigInt(componentId)));
		}
		for (const { entityId, componentId } of commands.iterate(
			RemoveComponentCommand,
		)) {
			let val = entityDestinations.get(entityId);
			if (val === 0n) {
				continue;
			}
			val ??= entities.getArchetype(entityId);
			entityDestinations.set(
				entityId,
				val | (val ^ (1n << BigInt(componentId))),
			);
		}

		// Move entities to their final destination
		for (const [entityId, archetype] of entityDestinations) {
			world.moveEntity(entityId, archetype);
		}

		// Handle data insertion from adds
		for (const command of commands.iterate(AddComponentCommand)) {
			const { entityId, componentId } = command;
			const { row, tableId } = entities.getLocation(entityId);
			const componentType = components[componentId];
			if (tableId === 0) {
				continue;
			}
			tables[tableId].copyDataIntoRow(row, componentType, command.store!);
		}
	}
}
const addComponent = new AddComponentCommand();

export class RemoveComponentCommand extends BaseComponentCommand {
	static with(entityId: u64, componentId: u32): RemoveComponentCommand {
		removeComponent.entityId = entityId;
		removeComponent.componentId = componentId;
		return removeComponent;
	}

	static iterate(commands: Commands, world: World) {}
}
const removeComponent = new RemoveComponentCommand();
