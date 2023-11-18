import type { World } from '../world';

import type { EventWriter } from './EventQueues';
import { Events } from './Events';

export class EventsCommandQueue {
	#writers: EventWriter<any>[];
	#queuesToClear: number[];

	constructor(writers: EventWriter<any>[]) {
		this.#writers = writers;
		this.#queuesToClear = [];
	}

	clear(queueId: number): void {
		this.#queuesToClear.push(queueId);
	}

	apply(world: World): void {
		for (const queueId of this.#queuesToClear) {
			this.#writers[queueId].clearImmediate();
		}
		this.#queuesToClear.length = 0;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	class LevelUpEvent {}

	it('clears event queues', async () => {
		const world = new World();

		const events = await world.getOrCreateResource(Events);
		const queue = world.commands.getQueue(EventsCommandQueue);
		const writer = events.getWriterOfType(LevelUpEvent);

		expect(writer.length).toBe(0);

		writer.create(new LevelUpEvent());
		expect(writer.length).toBe(1);

		writer.clear();
		expect(writer.length).toBe(1);

		queue.apply(world);
		expect(writer.length).toBe(0);
	});
}
