import type { World } from '../world';

import { Events } from './Events';
import type { EventWriter } from './EventQueues';

export class ClearEventsCommandQueue {
	#writers: EventWriter<any>[];
	eventQueuesToClear: number[];

	constructor(world: World) {
		this.#writers = world.getResource(Events)!.writers;
		this.eventQueuesToClear = [];
	}

	apply(world: World) {
		for (const queueId of this.eventQueuesToClear) {
			this.#writers[queueId].clearImmediate();
		}
		this.eventQueuesToClear.length = 0;
	}
}
