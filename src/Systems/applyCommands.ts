import defineSystem from './defineSystem';
import { P } from './Descriptors';

const mergeQueues = (a: Map<bigint, bigint>, b: Map<bigint, bigint>) => {
	for (const [key, bVal] of b) {
		a.set(key, (a.get(key) ?? 0n) & bVal);
	}
	return a;
};
export default defineSystem([P.World()], async function applyCommands(world) {
	const queue = (
		await world.threads.send<Map<bigint, bigint>>(
			'thyseus::getCommandQueue',
		)
	).reduce(mergeQueues, world.commands.queue);

	for (const [entityId, tableId] of queue) {
		world.moveEntity(entityId, tableId);
	}

	queue.clear();
});
