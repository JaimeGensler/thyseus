import { Memory } from '../../utils';
import type { u32 } from '../../struct';

export class ClearEventQueueCommand {
	static size = 8;
	static alignment = 4;
	__$$b = 0;
	deserialize() {
		this.eventVec = Memory.u32[this.__$$b >> 2];
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.eventVec;
	}

	eventVec: u32 = 0;
	size: u32 = 0;

	clear() {
		const length = Memory.u32[this.eventVec >> 2];
		const data = Memory.u32[(this.eventVec + 8) >> 2];
		Memory.set(data, length * this.size, 0);
		Memory.u32[this.eventVec >> 2] = 0;
	}
}
