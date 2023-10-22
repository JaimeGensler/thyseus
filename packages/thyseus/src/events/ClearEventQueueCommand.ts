import { Commands } from '../commands';
import { World } from '../world';
import { Events } from './Events';

export class ClearEventQueueCommand {
	eventId: number = 0;
	constructor(eventId: number) {
		this.eventId = eventId;
	}

	static iterate(commands: Commands, world: World): void {
		// SAFETY: `Events` must exist because it's used to create readers/writers
		const events = world.getResource(Events)!;
		for (const command of commands.iterate(ClearEventQueueCommand)) {
			events.writers[command.eventId].clearImmediate();
		}
	}
}
