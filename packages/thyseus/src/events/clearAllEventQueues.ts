import type { World } from '../world';

import { Events } from './Events';

export function clearAllEventQueues({ writers }: Events) {
	for (const writer of writers) {
		writer.clearImmediate();
	}
}
clearAllEventQueues.getSystemArguments = (world: World) => [
	world.getResource(Events),
];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	class LevelUpEvent {}

	it('clears event queues', async () => {
		const world = new World();

		const events = await world.getResource(Events);
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
