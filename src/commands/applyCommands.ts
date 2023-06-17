import { Memory } from '../utils';
import { WorldDescriptor } from '../world/WorldDescriptor';
import { SystemResourceDescriptor } from '../resources';
import {
	AddComponentCommand,
	RemoveComponentCommand,
	ClearEventQueueCommand,
} from './commandTypes';
import type { World } from '../world';
import type { SystemRes } from '../resources';

// @thyseus-ignore
export function applyCommands(
	world: World,
	entityDestinations: SystemRes<Map<bigint, bigint>>,
) {
	const { commands, entities, tables, components } = world;
	entities.resetCursor();
	entityDestinations.clear();

	// Main command handling loop
	for (const command of commands) {
		if (command instanceof ClearEventQueueCommand) {
			Memory.views.u32[command.queueLengthPointer >> 2] = 0;
			continue;
		}
		if (
			!(
				command instanceof AddComponentCommand ||
				command instanceof RemoveComponentCommand
			)
		) {
			continue;
		}
		const { entityId, componentId } = command;
		let val = entityDestinations.get(entityId);
		if (val === 0n) {
			continue;
		}
		val ??= entities.getArchetype(entityId);
		entityDestinations.set(
			entityId,
			command instanceof AddComponentCommand
				? val | (1n << BigInt(componentId))
				: componentId === 0
				? 0n
				: val ^ (1n << BigInt(componentId)),
		);
	}

	// Move entities to their final destination
	for (const [entityId, archetype] of entityDestinations) {
		world.moveEntity(entityId, archetype);
	}

	// Handle data insertion from adds
	for (const command of commands) {
		if (!(command instanceof AddComponentCommand)) {
			continue;
		}
		const { entityId, componentId, dataStart } = command;
		const tableId = entities.getTableId(entityId);
		if (tableId === 0) {
			continue;
		}
		tables[tableId]!.copyComponentIntoRow(
			entities.getRow(entityId),
			components[componentId],
			dataStart,
		);
	}

	commands.reset();
}
applyCommands.parameters = [
	new WorldDescriptor(),
	new SystemResourceDescriptor(Map),
];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world/World');
	const { Memory } = await import('../utils');

	beforeEach(() => Memory.UNSAFE_CLEAR_ALL());

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
			return Memory.views.u32[this.__$$b >> 2];
		}
		get y() {
			return Memory.views.u32[(this.__$$b >> 2) + 1];
		}
		set x(val: number) {
			Memory.views.u32[this.__$$b >> 2] = val;
		}
		set y(val: number) {
			Memory.views.u32[(this.__$$b >> 2) + 1] = val;
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
		const archetypeD = myWorld.tables[1];
		const testComp = new CompD();

		const column =
			Memory.views.u32[archetypeD.getColumnPointer(CompD) >> 2];

		testComp.__$$b = column;
		expect(archetypeD.length).toBe(1);
		expect(testComp.x).toBe(1);
		expect(testComp.y).toBe(2);
	});

	it('clears event queues', async () => {
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
