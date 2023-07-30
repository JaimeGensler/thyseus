import { WorldDescriptor } from '../world/WorldDescriptor';
import {
	AddComponentCommand,
	RemoveComponentTypeCommand,
	ClearEventQueueCommand,
	AddComponentTypeCommand,
} from './commandTypes';
import type { World } from '../world';
import { Struct, StructInstance } from '../struct';

const defaultData = new Map<Struct, StructInstance>();
const entityDestinations = new Map<bigint, bigint>();
// @thyseus-ignore
export function applyCommands(world: World) {
	const { commands, entities, tables, components } = world;
	entities.resetCursor();
	entityDestinations.clear();

	// Main command handling loop
	for (const command of commands) {
		if (command instanceof ClearEventQueueCommand) {
			command.clear();
			continue;
		}
		if (
			!(
				command instanceof AddComponentTypeCommand ||
				command instanceof RemoveComponentTypeCommand
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
			command instanceof AddComponentTypeCommand
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
		if (!(command instanceof AddComponentTypeCommand)) {
			continue;
		}
		const { entityId, componentId } = command;
		const tableId = entities.getTableId(entityId);
		const componentType = components[componentId];
		const row = entities.getRow(entityId);
		if (tableId === 0) {
			continue;
		}
		if (command instanceof AddComponentCommand) {
			tables[tableId]!.copyDataIntoRow(
				row,
				componentType,
				command.dataStart,
			);
		} else {
			if (!defaultData.has(componentType)) {
				defaultData.set(
					componentType,
					new componentType() as StructInstance,
				);
			}
			tables[tableId]!.copyComponentIntoRow(
				row,
				componentType,
				defaultData.get(componentType)!,
			);
		}
	}

	// SAFETY: We have ownership of World right now, this is safe.
	(commands as any).reset();
}
applyCommands.parameters = [new WorldDescriptor()];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { World } = await import('../world');
	const { Memory } = await import('../utils');

	beforeEach(() => Memory.UNSAFE_CLEAR_ALL());

	class ZST {
		static size = 0;
		static alignment = 1;
		deserialize() {}
		serialize() {}
	}

	class Struct {
		static size = 1;
		static alignment = 1;
		__$$b = 0;
		deserialize() {}
		serialize() {}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static size = 8;
		static alignment = 4;
		__$$b = 0;
		deserialize() {
			this.x = Memory.u32[this.__$$b >> 2];
			this.y = Memory.u32[(this.__$$b + 4) >> 2];
		}
		serialize() {
			Memory.u32[this.__$$b >> 2] = this.x;
			Memory.u32[(this.__$$b + 4) >> 2] = this.y;
		}

		x: number;
		y: number;
		constructor(x = 23, y = 42) {
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
		const world = await createWorld();
		const moveEntitySpy = vi.spyOn(world, 'moveEntity');
		world.commands.spawn().addType(CompA).add(new CompD());
		world.commands.spawn().addType(CompB).addType(ZST).add(new CompD());
		const archetype1 =
			1n |
			(1n << BigInt(world.getComponentId(CompA))) |
			(1n << BigInt(world.getComponentId(CompD)));
		const archetype2 =
			1n |
			(1n << BigInt(world.getComponentId(CompB))) |
			(1n << BigInt(world.getComponentId(ZST))) |
			(1n << BigInt(world.getComponentId(CompD)));

		applyCommands(world);
		expect(moveEntitySpy).toHaveBeenCalledTimes(2);
		expect(moveEntitySpy).toHaveBeenCalledWith(0n, archetype1);
		expect(moveEntitySpy).toHaveBeenCalledWith(1n, archetype2);
	});

	it('initializes data', async () => {
		const myWorld = await createWorld();
		myWorld.commands.spawn().addType(CompA).add(new CompD(1, 2));

		applyCommands(myWorld);
		const archetypeD = myWorld.tables[1];
		const testComp = new CompD();

		testComp.__$$b = Memory.u32[archetypeD.getColumnPointer(CompD) >> 2];
		testComp.deserialize();
		expect(archetypeD.length).toBe(1);
		expect(testComp.y).toBe(2);
		expect(testComp.x).toBe(1);
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

		applyCommands(myWorld);
		expect(writer.length).toBe(0);
	});
}
