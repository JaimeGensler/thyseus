import { Memory } from '../../utils';
import type { u32 } from '../../struct';

export class ClearEventQueueCommand {
	static size = 4;
	static alignment = 4;
	__$$b = 0;
	deserialize() {
		this.queueLengthPointer = Memory.u32[this.__$$b >> 2];
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.queueLengthPointer;
	}

	queueLengthPointer: u32 = 0;
}
