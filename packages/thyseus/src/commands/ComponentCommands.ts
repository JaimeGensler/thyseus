import { Entity } from '../entities';
import type { Store } from '../storage';
import type { u64, u32, StructInstance } from '../struct';
import { alignTo8 } from '../utils';

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
}
const addComponent = new AddComponentCommand();

export class RemoveComponentCommand extends BaseComponentCommand {
	static with(entityId: u64, componentId: u32): RemoveComponentCommand {
		removeComponent.entityId = entityId;
		removeComponent.componentId = componentId;
		return removeComponent;
	}
}
const removeComponent = new RemoveComponentCommand();
