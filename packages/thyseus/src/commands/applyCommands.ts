import { WorldDescriptor } from '../world/WorldDescriptor';

import type { World } from '../world';

/**
 * A system that applies all commands that have been enqueued in a world.
 * @param world The world to apply commands in.
 */
export function applyCommands(world: World) {
	const { commands, entities } = world;
	entities.resetCursor();

	for (const queue of commands) {
		queue.apply(world);
	}
}
applyCommands.parameters = [new WorldDescriptor()];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { EntityCommandQueue } = await import('./EntityCommandQueue');

	it('resets entities cursor, calls apply for all command queues', async () => {
		const world = await World.new().build();
		class CustomQueue {
			apply(world: World) {}
		}

		const resetCursorSpy = vi.spyOn(world.entities, 'resetCursor');
		const entityCommandQueueSpy = vi.spyOn(
			EntityCommandQueue.prototype,
			'apply',
		);
		const customQueueSpy = vi.spyOn(CustomQueue.prototype, 'apply');
		world.commands.getQueue(CustomQueue);

		expect(resetCursorSpy).not.toHaveBeenCalled();
		expect(entityCommandQueueSpy).not.toHaveBeenCalled();
		expect(customQueueSpy).not.toHaveBeenCalled();

		applyCommands(world);

		expect(resetCursorSpy).toHaveBeenCalledOnce();
		expect(entityCommandQueueSpy).toHaveBeenCalledOnce();
		expect(entityCommandQueueSpy).toHaveBeenCalledWith(world);
		expect(customQueueSpy).toHaveBeenCalledOnce();
		expect(customQueueSpy).toHaveBeenCalledWith(world);
	});
}
