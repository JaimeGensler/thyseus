import { WorldDescriptor } from '../world/WorldDescriptor';

import type { World } from '../world';
import type { Store } from '../storage';

export function applyCommands(world: World) {
	const { commands, entities } = world;
	entities.resetCursor();

	for (const commandType of commands.commandTypes) {
		commandType.iterate(commands, world);
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
