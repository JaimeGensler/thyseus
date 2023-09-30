import type { u64, u32, StructInstance } from '../../struct';
import { Entity, type Store } from '../../storage';

class BaseComponentCommand {
	static readonly size = 16; // Size is for struct internals, payload follows
	static readonly alignment = 8;
	deserialize(store: Store) {
		this.entityId = store.readU64();
		this.componentId = store.readU32();
	}
	serialize(store: Store) {
		store.writeU64(this.entityId);
		store.writeU32(this.componentId);
	}

	entityId: u64 = 0n;
	componentId: u32 = 0;
}

export class AddComponentTypeCommand extends BaseComponentCommand {
	static with(
		entityId: u64,
		componentId: u32,
		_?: any,
	): AddComponentTypeCommand {
		addComponentType.entityId = entityId;
		addComponentType.componentId = componentId;
		return addComponentType;
	}
}
const addComponentType = new AddComponentTypeCommand();

export const plainEntity = new Entity();
export class AddComponentCommand extends AddComponentTypeCommand {
	component: StructInstance = plainEntity as any;
	serialize(store: Store) {
		super.serialize(store);
		this.component.serialize!(store);
	}
	deserialize(store: Store) {
		super.deserialize(store);
		this.store = store;
	}
	store: Store | null = null;

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

export class RemoveComponentTypeCommand extends BaseComponentCommand {
	static with(entityId: u64, componentId: u32): RemoveComponentTypeCommand {
		removeComponent.entityId = entityId;
		removeComponent.componentId = componentId;
		return removeComponent;
	}
}
const removeComponent = new RemoveComponentTypeCommand();
