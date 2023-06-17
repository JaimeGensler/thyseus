import { Memory } from '../../utils';

const { views } = Memory;
export class ClearEventQueueCommand {
	static size = 4;
	static alignment = 4;

	declare __$$b: number;
	constructor() {
		this.__$$b = 0;
	}
	get queueLengthPointer(): number {
		return views.u32[this.__$$b >> 2];
	}
	set queueLengthPointer(value: number) {
		views.u32[this.__$$b >> 2] = value;
	}
}
