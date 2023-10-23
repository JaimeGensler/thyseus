import type { World } from '../world';

import { Events } from './Events';

export class ClearEventsCommandQueue {
	#events: Events;
	eventQueuesToClear: number[];

	constructor(world: World) {
		this.#events = world.getResource(Events)!;
		this.eventQueuesToClear = [];
	}

	apply(world: World) {
		for (const queueId of this.eventQueuesToClear) {
			this.#events.writers[queueId].clearImmediate();
		}
		this.eventQueuesToClear.length = 0;
	}
}
