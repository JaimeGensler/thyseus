import { Memory } from '../../utils';
import type { u64, u32, StructInstance } from '../../struct';
import { Entity } from '../../storage';

class BaseComponentCommand {
	static size = 16; // Size is for struct internals, payload follows
	static alignment = 8;
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

const entity = new Entity();
export class AddComponentTypeCommand extends BaseComponentCommand {}
export class AddComponentCommand extends AddComponentTypeCommand {
	component: StructInstance = entity as any;
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
}
export class RemoveComponentTypeCommand extends BaseComponentCommand {}
