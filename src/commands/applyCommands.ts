import { memory } from '../utils/memory';
import { SystemResourceDescriptor, WorldDescriptor } from '../descriptors';
import {
	ADD_COMPONENT_COMMAND,
	CLEAR_QUEUE_COMMAND,
	REMOVE_COMPONENT_COMMAND,
} from './Commands';
import type { World } from '../world';
import type { Res } from '../resources';

export function applyCommands(
	world: World,
	entityDestinations: Res<Map<bigint, bigint>>,
) {
	const { commands, entities, archetypes, components } = world;
	entities.resetCursor();
	entityDestinations.clear();

	for (const { type, dataStart } of commands) {
		if (type === CLEAR_QUEUE_COMMAND) {
			const queueLengthPointer = memory.views.u32[dataStart >> 2];
			memory.views.u32[queueLengthPointer >> 2] = 0;
		}
		if (
			type !== ADD_COMPONENT_COMMAND &&
			type !== REMOVE_COMPONENT_COMMAND
		) {
			continue;
		}
		const entityId = memory.views.u64[dataStart >> 3];
		let val = entityDestinations.get(entityId);
		if (val === 0n) {
			continue;
		}
		const componentId = memory.views.u16[(dataStart + 8) >> 1];
		val ??= entities.getBitset(entityId);
		entityDestinations.set(
			entityId,
			type === ADD_COMPONENT_COMMAND
				? val | (1n << BigInt(componentId))
				: componentId === 0
				? 0n
				: val ^ (1n << BigInt(componentId)),
		);
	}
	for (const [entityId, tableId] of entityDestinations) {
		world.moveEntity(entityId, tableId);
	}

	for (const { type, dataStart } of commands) {
		if (type !== ADD_COMPONENT_COMMAND) {
			continue;
		}
		const entityId = memory.views.u64[dataStart >> 3];
		const tableId = entities.getTableIndex(entityId);
		if (tableId === 0 || tableId === 1) {
			continue;
		}
		const componentId = memory.views.u32[(dataStart + 8) >> 2];
		archetypes[tableId].copyComponentIntoRow(
			entities.getRow(entityId),
			components[componentId],
			dataStart + 16,
		);
	}

	commands.reset();
}
applyCommands.parameters = [WorldDescriptor(), SystemResourceDescriptor(Map)];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world/World');
	const { memory } = await import('../utils/memory');

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	class ZST {
		static size = 0;
		static alignment = 1;
	}
	class Struct {
		static size = 1;
		static alignment = 1;
		constructor() {
			initStruct(this);
		}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static size = 8;
		static alignment = 4;

		declare __$$b: number;
		get x() {
			return memory.views.u32[this.__$$b >> 2];
		}
		get y() {
			return memory.views.u32[(this.__$$b >> 2) + 1];
		}
		set x(val: number) {
			memory.views.u32[this.__$$b >> 2] = val;
		}
		set y(val: number) {
			memory.views.u32[(this.__$$b >> 2) + 1] = val;
		}

		constructor(x = 23, y = 42) {
			initStruct(this);
			this.x = x;
			this.y = y;
		}
	}

	const createWorld = () =>
		World.new({ isMainThread: true })
			.registerComponent(ZST)
			.registerComponent(CompA)
			.registerComponent(CompB)
			.registerComponent(CompC)
			.registerComponent(CompD)
			.build();

	it('moves entities', async () => {
		const myWorld = await createWorld();
		const moveEntitySpy = vi.spyOn(myWorld, 'moveEntity');
		myWorld.commands.spawn().addType(CompA).add(new CompD());
		myWorld.commands.spawn().addType(CompB).addType(ZST).add(new CompD());

		applyCommands(myWorld, new Map());
		expect(moveEntitySpy).toHaveBeenCalledTimes(2);
		expect(moveEntitySpy).toHaveBeenCalledWith(0n, 0b100101n);
		expect(moveEntitySpy).toHaveBeenCalledWith(1n, 0b101011n);
	});

	it('initializes data', async () => {
		const myWorld = await createWorld();
		myWorld.commands.spawn().addType(CompA).add(new CompD(1, 2));

		applyCommands(myWorld, new Map());
		const archetypeD = myWorld.archetypes[2];
		const testComp = new CompD();

		testComp.__$$b = archetypeD.getColumn(CompD)!;
		expect(archetypeD.length).toBe(1);
		expect(testComp.x).toBe(1);
		expect(testComp.y).toBe(2);
	});

	it('clears queues', async () => {
		const myWorld = await World.new({ isMainThread: true })
			.registerEvent(CompA)
			.build();

		const writer = myWorld.eventWriters[0];
		expect(writer.length).toBe(0);
		writer.createDefault();
		expect(writer.length).toBe(1);
		writer.clear();
		expect(writer.length).toBe(1);

		applyCommands(myWorld, new Map());
		expect(writer.length).toBe(0);
	});
}
