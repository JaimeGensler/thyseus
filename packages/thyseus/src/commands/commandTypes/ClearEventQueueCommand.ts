import { Memory } from '../../utils';
import type { u32 } from '../../struct';

export class ClearEventQueueCommand {
	static readonly size = 8;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.resourceId = Memory.u32[this.__$$b >> 2];
		this.eventId = Memory.u32[(this.__$$b + 4) >> 2];
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.resourceId;
		Memory.u32[(this.__$$b + 4) >> 2] = this.eventId;
	}

	resourceId: u32 = 0;
	eventId: u32 = 0;
	static with(resourceId: u32, eventId: u32) {
		clearQueueCommand.resourceId = resourceId;
		clearQueueCommand.eventId = eventId;
		return clearQueueCommand;
	}
}
const clearQueueCommand = new ClearEventQueueCommand();
