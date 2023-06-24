import { Memory } from '../../utils';

class BaseComponentCommand {
	static size = 16; // Size is for struct internals, payload follows
	static alignment = 8;
	declare __$$b: number;

	constructor() {
		this.__$$b = 0;
	}

	get entityId() {
		return Memory.u64[this.__$$b >> 3];
	}
	set entityId(value: bigint) {
		Memory.u64[this.__$$b >> 3] = value;
	}
	get componentId() {
		return Memory.u16[(this.__$$b + 8) >> 1];
	}
	set componentId(value: number) {
		Memory.u16[(this.__$$b + 8) >> 1] = value;
	}
}

export class AddComponentCommand extends BaseComponentCommand {
	get dataStart() {
		return this.__$$b + AddComponentCommand.size;
	}
}
export class RemoveComponentCommand extends BaseComponentCommand {}
