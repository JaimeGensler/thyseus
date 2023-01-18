import { CLEAR_COMMAND_QUEUE, GET_COMMAND_QUEUE } from '../world/channels';
import { defineSystem } from './defineSystem';
import type { World } from '../world';

type CommandQueue = [Map<bigint, bigint>, Uint8Array];
function* iterateCommands(commandsData: CommandQueue[], world: World) {
	for (const [, queueData] of commandsData) {
		const dataview = new DataView(queueData.buffer);
		for (let offset = 0; offset < queueData.byteLength; ) {
			const entityId = dataview.getBigUint64(offset);
			const componentId = dataview.getUint32(offset + 8);
			const component = world.components[componentId];
			offset += 16;
			const data = queueData.subarray(offset, offset + component.size!);
			yield [entityId, component, data] as const;
			offset += component.size!;
		}
	}
}
function mergeQueues(acc: Map<bigint, bigint>, [b]: CommandQueue) {
	for (const [key, bVal] of b) {
		const aVal = acc.get(key);
		if (aVal === undefined) {
			acc.set(key, bVal);
		} else if (bVal === 0n) {
			acc.set(key, 0n);
		} else if (aVal !== 0n) {
			acc.set(key, aVal | bVal);
		}
	}
	return acc;
}
export const applyCommands = defineSystem(
	({ World }) => [World()],
	async function applyCommands(world) {
		if (world.entities.isFull) {
			world.entities.grow(world);
		}
		const [mainQueue, mainQueueData] = world.commands.getData();
		const queues = await world.threads.send(GET_COMMAND_QUEUE());
		const queue = queues.reduce(mergeQueues, mainQueue);

		for (const [entityId, tableId] of queue) {
			world.moveEntity(entityId, tableId);
		}

		queues.push([mainQueue, mainQueueData]);
		for (const [entityId, component, data] of iterateCommands(
			queues,
			world,
		)) {
			const tableId = world.entities.getTableIndex(entityId);
			if (tableId === 0 || tableId === 1) {
				continue;
			}

			if (component.name === 'Velocity') {
				console.log(data.length);
			}
			const column = world.archetypes[tableId].columns.get(component)!;
			const row = world.entities.getRow(entityId);
			column.u8.set(data, row * component.size!);
		}

		const clear = world.threads.send(CLEAR_COMMAND_QUEUE());
		world.commands.reset();
		world.entities.resetCursor();
		return clear;
	},
);
