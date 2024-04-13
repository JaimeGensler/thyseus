import type { World } from '../world';

import { Events } from './Events';

export function clearAllEventQueues({ writers }: Events) {
	for (const writer of writers) {
		writer.clear();
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
	class LevelDownEvent {}

	it('clears event queues', async () => {
		const world = new World();

		const events = await world.getResource(Events);
		const upWriter = events.getWriter(LevelUpEvent);
		const downWriter = events.getWriter(LevelDownEvent);

		expect(upWriter.length).toBe(0);
		expect(downWriter.length).toBe(0);

		upWriter.create(new LevelUpEvent());
		downWriter.create(new LevelDownEvent());
		downWriter.create(new LevelDownEvent());
		expect(upWriter.length).toBe(1);
		expect(downWriter.length).toBe(2);

		clearAllEventQueues(events);
		expect(upWriter.length).toBe(0);
		expect(downWriter.length).toBe(0);
	});
}
