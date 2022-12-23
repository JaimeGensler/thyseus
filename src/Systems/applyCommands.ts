import { GET_COMMAND_QUEUE } from '../World/channels';
import { defineSystem } from './defineSystem';

const mergeQueues = (a: Map<bigint, bigint>, b: Map<bigint, bigint>) => {
	for (const [key, bVal] of b) {
		const aVal = a.get(key);
		if (aVal === undefined) {
			a.set(key, bVal);
		} else if (aVal !== 0n) {
			a.set(key, aVal | bVal);
		}
	}
	return a;
};
export const applyCommands = defineSystem(
	({ World }) => [World()],
	async function applyCommands(world) {
		if (world.entities.isFull) {
			world.entities.grow(world);
		}
		const queue = (await world.threads.send(GET_COMMAND_QUEUE())).reduce(
			mergeQueues,
			world.commands.queue,
		);

		for (const [entityId, tableId] of queue) {
			world.moveEntity(entityId, tableId);
		}

		queue.clear();
		world.entities.resetCursor();
	},
);
