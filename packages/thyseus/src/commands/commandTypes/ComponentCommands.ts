import { Memory } from '../../utils';
import type { u64, u32, StructInstance } from '../../struct';
import { Entity } from '../../storage';

class BaseComponentCommand {
	static readonly size = 16; // Size is for struct internals, payload follows
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.entityId = Memory.u64[this.__$$b >> 3];
		this.componentId = Memory.u16[(this.__$$b + 8) >> 1];
	}
	serialize() {
		Memory.u64[this.__$$b >> 3] = this.entityId;
		Memory.u16[(this.__$$b + 8) >> 1] = this.componentId;
	}

	entityId: u64 = 0n;
	componentId: u32 = 0;
}

export class AddComponentTypeCommand extends BaseComponentCommand {
	static with(entityId: u64, componentId: u32, _?: any) {
		addComponentType.entityId = entityId;
		addComponentType.componentId = componentId;
		return addComponentType;
	}
}
const addComponentType = new AddComponentTypeCommand();

export const plainEntity = new Entity();
export class AddComponentCommand extends AddComponentTypeCommand {
	component: StructInstance = plainEntity as any;
	serialize() {
		super.serialize();
		const previous = this.component!.__$$b;
		this.component!.__$$b = this.__$$b + AddComponentCommand.size;
		this.component!.serialize();
		this.component!.__$$b = previous;
	}
	get dataStart() {
		return this.__$$b + AddComponentCommand.size;
	}
	static with(entityId: u64, componentId: u32, component: StructInstance) {
		addComponentType.entityId = entityId;
		addComponentType.componentId = componentId;
		addComponent.component = component;
		return addComponentType;
	}
}
const addComponent = new AddComponentCommand();

export class RemoveComponentTypeCommand extends BaseComponentCommand {
	static with(entityId: u64, componentId: u32) {
		removeComponent.entityId = entityId;
		removeComponent.componentId = componentId;
		return removeComponent;
	}
}
const removeComponent = new RemoveComponentTypeCommand();
