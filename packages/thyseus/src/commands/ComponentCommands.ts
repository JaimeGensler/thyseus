import { alignTo8 } from '../utils';
import type { Store } from '../storage';
import type { u64, u32, StructInstance } from '../components';
import type { World } from '../world';
import type { Commands } from './Commands';

class BaseComponentCommand {
	static readonly size = 16; // Size is for struct internals, payload follows
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.entityId = store.readU64();
		this.componentId = store.readU32();
		this.boxedOffset = store.readU32();
	}
	serialize(store: Store) {
		store.writeU64(this.entityId);
		store.writeU32(this.componentId);
		store.writeU32(this.boxedOffset);
	}

	entityId: u64 = 0n;
	componentId: u32 = 0;
	boxedOffset: u32 = 0;
}

export class AddComponentCommand extends BaseComponentCommand {
	component: StructInstance | null = null;
	store: Store | null = null;
	deserialize(store: Store) {
		super.deserialize(store);
		this.store = store;
		store.offset = alignTo8(store.offset);
		store.boxedOffset = this.boxedOffset;
	}
	serialize(store: Store) {
		super.serialize(store);
		this.component!.serialize!(store);
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

	static iterate = handleComponentCommands;
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

const entityDestinations = new Map<bigint, bigint>();
function handleComponentCommands(commands: Commands, world: World) {
	const { entities, tables, components } = world;
	// Find where entities will end up
	entityDestinations.clear();
	for (const { entityId, componentId, store } of commands.iterate(
		AddComponentCommand,
	)) {
		store!.offset += alignTo8(world.components[componentId].size!);
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
		entityDestinations.set(entityId, val ^ (1n << BigInt(componentId)));
	}

	// Move entities to their final destination
	for (const [entityId, archetype] of entityDestinations) {
		world.moveEntity(entityId, archetype);
	}

	// Handle data insertion from adds
	for (const {
		entityId,
		componentId,
		store,
		boxedOffset,
	} of commands.iterate(AddComponentCommand)) {
		const { row, tableId } = entities.getLocation(entityId);
		const componentType = components[componentId];
		if (tableId === 0) {
			continue;
		}
		tables[tableId].copyDataIntoRow(
			row,
			componentType,
			store!,
			boxedOffset,
		);
		store!.offset += alignTo8(componentType.size!);
	}
}
