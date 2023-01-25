import { CLEAR_COMMAND_QUEUE, GET_COMMAND_QUEUE } from '../world/channels';
import { defineSystem } from './defineSystem';
import { alignTo8 } from '../utils/alignTo8';
import type { World } from '../world';

type CommandQueue = [Map<bigint, bigint>, Uint8Array, DataView];
function* iterateCommands(commandsData: CommandQueue[], world: World) {
	for (const [, queueData, queueView] of commandsData) {
		for (let offset = 0; offset < queueData.byteLength; ) {
			const entityId = queueView.getBigUint64(offset);
			const componentId = queueView.getUint32(offset + 8);
			const component = world.components[componentId];
			offset += 16;
			const data = queueData.subarray(offset, offset + component.size!);
			yield [entityId, component, data] as const;
			offset += alignTo8(component.size!);
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
		const [mainQueue, mainQueueData, mainQueueView] =
			world.commands.getData();
		const queues = await world.threads.send(GET_COMMAND_QUEUE());
		const queue = queues.reduce(mergeQueues, mainQueue);

		for (const [entityId, tableId] of queue) {
			world.moveEntity(entityId, tableId);
		}

		queues.push([mainQueue, mainQueueData, mainQueueView]);
		for (const [entityId, component, data] of iterateCommands(
			queues,
			world,
		)) {
			const tableId = world.entities.getTableIndex(entityId);
			if (tableId === 0 || tableId === 1) {
				continue;
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

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world/World');
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

	class ZST {
		static size = 0;
		static alignment = 1;
		static schema = 0;
	}
	class Struct {
		static size = 1;
		static alignment = 1;
		static schema = 0;
		constructor() {
			initStruct(this);
		}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static schema = 0b1111_1111_1111;
		static size = 8;
		static alignment = 4;

		declare __$$s: any;
		get x() {
			return this.__$$s.u32[0];
		}
		get y() {
			return this.__$$s.u32[1];
		}
		set x(val: number) {
			this.__$$s.u32[0] = val;
		}
		set y(val: number) {
			this.__$$s.u32[1] = val;
		}

		constructor(x = 23, y = 42) {
			initStruct(this);
			this.x = x;
			this.y = y;
		}
	}

	const getWorld = () =>
		World.new()
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
			.build();

	it('moves entities', async () => {
		const myWorld = await getWorld();
		const moveEntitySpy = vi.spyOn(myWorld, 'moveEntity');
		myWorld.commands.spawn().addType(CompA).add(new CompD());
		myWorld.commands.spawn().addType(CompB).addType(ZST).add(new CompD());
		await applyCommands.fn(myWorld);
		expect(moveEntitySpy).toHaveBeenCalledTimes(2);
		expect(moveEntitySpy).toHaveBeenCalledWith(0n, 0b100101n);
		expect(moveEntitySpy).toHaveBeenCalledWith(1n, 0b101011n);
	});

	it('initializes data', async () => {
		const myWorld = await getWorld();
		myWorld.commands.spawn().addType(CompA).add(new CompD(1, 2));
		await applyCommands.fn(myWorld);
		const archetypeD = myWorld.archetypes[2];
		const testComp = new CompD();

		testComp.__$$s = archetypeD.columns.get(CompD)!;

		expect(testComp.x).toBe(1);
		expect(testComp.y).toBe(2);
	});
}
