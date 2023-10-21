import { Commands } from '../commands';
import { Store } from '../storage';
import { u32 } from '../components';
import { World } from '../world';
import { Events } from './Events';

export class ClearEventQueueCommand {
	static readonly size = 8;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store): void {
		this.eventId = store.readU32();
	}
	serialize(store: Store): void {
		store.writeU32(this.eventId);
	}
	eventId: u32 = 0;

	static iterate(commands: Commands, world: World): void {
		// SAFETY: `Events` must exist because it's used to create readers/writers
		const events = world.getResource(Events)!;
		for (const command of commands.iterate(ClearEventQueueCommand)) {
			events.writers[command.eventId].clearImmediate();
		}
	}

	static with(eventId: u32): ClearEventQueueCommand {
		clearQueueCommand.eventId = eventId;
		return clearQueueCommand;
	}
}
const clearQueueCommand = new ClearEventQueueCommand();
