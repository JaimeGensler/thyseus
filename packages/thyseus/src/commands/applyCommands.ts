import { WorldDescriptor } from '../world/WorldDescriptor';
import {
	AddComponentCommand,
	RemoveComponentTypeCommand,
	ClearEventQueueCommand,
	AddComponentTypeCommand,
} from './commandTypes';
import type { World } from '../world';
import type { Struct, StructInstance } from '../struct';
import type { Store } from '../storage';

const defaultData = new Map<Struct, StructInstance>();
const entityDestinations = new Map<bigint, bigint>();
export function applyCommands(world: World) {
	const { commands, entities, tables, components, resources } = world;
	entities.resetCursor();
	entityDestinations.clear();

	// Main command handling loop
	for (const command of commands) {
		if (command instanceof ClearEventQueueCommand) {
			// Look up events by resource ID to avoid pulling in Events class
			(resources[command.resourceId] as any).writers[
				command.eventId
			].clearImmediate();
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
		const { row, tableId } = entities.getLocation(entityId);
		const componentType = components[componentId];
		if (tableId === 0) {
			continue;
		}
		const table = tables[tableId];
		if (command instanceof AddComponentCommand) {
			table.copyDataIntoRow(row, componentType, command.store!);
		} else {
			if (!defaultData.has(componentType)) {
				defaultData.set(
					componentType,
					new componentType() as StructInstance,
				);
			}
			table.copyComponentIntoRow(
				row,
				componentType,
				defaultData.get(componentType)!,
			);
		}
	}

	// SAFETY: We have ownership of World right now.
	(commands as any).reset();
}
applyCommands.parameters = [new WorldDescriptor()];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { EventWriterDescriptor } = await import('../events');

	class ZST {
		static size = 0;
		static alignment = 1;
		deserialize() {}
		serialize() {}
	}

	class Struct {
		static size = 1;
		static alignment = 1;
		deserialize() {}
		serialize() {}
	}
	class CompA extends Struct {}
	class CompB extends Struct {}
	class CompC extends Struct {}
	class CompD {
		static size = 8;
		static alignment = 4;
		deserialize(store: Store) {
			this.x = store.readU32();
			this.y = store.readU32();
		}
		serialize(store: Store) {
			store.writeU32(this.x);
			store.writeU32(this.y);
		}

		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}
	const createWorld = () =>
		World.new()
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
		const tableD = myWorld.tables[1];
		const testComp = new CompD();

		const column = tableD.getColumn(CompD);
		column.offset = 0;
		testComp.deserialize(column);
		expect(tableD.length).toBe(1);
		expect(testComp.x).toBe(1);
		expect(testComp.y).toBe(2);
	});

	it('clears event queues', async () => {
		function mySystem() {}
		mySystem.parameters = [new EventWriterDescriptor(CompA)];
		const myWorld = await World.new().addSystems(mySystem).build();

		const writer = (myWorld.resources[0] as any).writers[0];
		expect(writer.length).toBe(0);
		writer.createDefault();
		expect(writer.length).toBe(1);
		writer.clear();
		expect(writer.length).toBe(1);

		applyCommands(myWorld);
		expect(writer.length).toBe(0);
	});
}
