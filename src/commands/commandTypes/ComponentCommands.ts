import { Memory } from '../../utils';

const { views } = Memory;
class BaseComponentCommand {
	static size = 16; // Size is for struct internals, payload follows
	static alignment = 8;
	declare __$$b: number;

	constructor() {
		this.__$$b = 0;
	}

	get entityId() {
		return views.u64[this.__$$b >> 3];
	}
	set entityId(value: bigint) {
		views.u64[this.__$$b >> 3] = value;
	}
	get componentId() {
		return views.u16[(this.__$$b + 8) >> 1];
	}
	set componentId(value: number) {
		views.u16[(this.__$$b + 8) >> 1] = value;
	}
}

export class AddComponentCommand extends BaseComponentCommand {
	get dataStart() {
		return this.__$$b + AddComponentCommand.size;
	}
}
export class RemoveComponentCommand extends BaseComponentCommand {}
