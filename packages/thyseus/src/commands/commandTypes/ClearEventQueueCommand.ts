import { Memory } from '../../utils';
import type { u32 } from '../../struct';

export class ClearEventQueueCommand {
	static readonly size = 4;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.eventId = Memory.u32[this.__$$b >> 2];
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.eventId;
	}

	eventId: u32 = 0;
}
