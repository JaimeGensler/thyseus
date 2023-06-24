import { Memory } from '../../utils';

export class ClearEventQueueCommand {
	static size = 4;
	static alignment = 4;

	declare __$$b: number;
	constructor() {
		this.__$$b = 0;
	}
	get queueLengthPointer(): number {
		return Memory.u32[this.__$$b >> 2];
	}
	set queueLengthPointer(value: number) {
		Memory.u32[this.__$$b >> 2] = value;
	}
}
