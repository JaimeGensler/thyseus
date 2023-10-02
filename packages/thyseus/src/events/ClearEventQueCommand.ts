import { Commands } from '../commands';
import { Store } from '../storage';
import { u32 } from '../struct';
import { World } from '../world';
import { Events } from './Events';

export class ClearEventQueueCommand {
	static readonly size = 8;
	static readonly alignment = 4;
	deserialize(store: Store) {
		this.eventId = store.readU32();
	}
	serialize(store: Store) {
		store.writeU32(this.eventId);
	}

	static iterate(world: World, commands: Commands) {
		const events = world.getResource(Events);
		for (const command of commands.iterate(this)) {
			events.writers[command.eventId].clearImmediate();
			continue;
		}
	}

	eventId: u32 = 0;

	static with(eventId: u32) {
		clearQueueCommand.eventId = eventId;
		return clearQueueCommand;
	}
}
const clearQueueCommand = new ClearEventQueueCommand();
