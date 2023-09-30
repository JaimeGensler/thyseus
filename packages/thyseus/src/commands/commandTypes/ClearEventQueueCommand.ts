import type { u32 } from '../../struct';
import type { Store } from '../../storage';

export class ClearEventQueueCommand {
	static readonly size = 8;
	static readonly alignment = 4;
	deserialize(store: Store) {
		this.resourceId = store.readU32();
		this.eventId = store.readU32();
	}
	serialize(store: Store) {
		store.writeU32(this.resourceId);
		store.writeU32(this.eventId);
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
