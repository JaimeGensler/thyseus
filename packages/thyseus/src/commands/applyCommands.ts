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
	const { EventWriterDescriptor } = await import('../events');
	const { Tag } = await import('../components');

	class ZST extends Tag {}

	class CompA {}
	class CompB {}
	class CompC {}
	class CompD {
		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}
	const createWorld = async () => {
		const world = await World.new().build();
		world.components.push(ZST, CompA, CompB, CompC, CompD);
		return world;
	};

	it.only('moves entities', async () => {
		const world = await createWorld();
		const moveEntitySpy = vi.spyOn(world, 'moveEntity');
		const { entity: e1 } = world.commands
			.spawn()
			.add(new CompA())
			.add(new CompD());
		const { entity: e2 } = world.commands
			.spawn()
			.add(new CompB())
			.addType(ZST)
			.add(new CompD());
		const archetype1 = world.getArchetype(CompA, CompD);
		const archetype2 = world.getArchetype(CompB, ZST, CompD);

		applyCommands(world);
		expect(moveEntitySpy).toHaveBeenCalledTimes(2);
		expect(moveEntitySpy).toHaveBeenCalledWith(e1, archetype1);
		expect(moveEntitySpy).toHaveBeenCalledWith(e2, archetype2);
	});

	it('initializes data', async () => {
		const myWorld = await createWorld();
		myWorld.commands.spawn().add(new CompA()).add(new CompD(1, 2));

		applyCommands(myWorld);
		const tableD = myWorld.tables[1];
		const comp = tableD.getColumn(CompD)[0];

		expect(tableD.length).toBe(1);
		expect(comp).toBeInstanceOf(CompD);
		if (comp instanceof CompD) {
			expect(comp.x).toBe(1);
			expect(comp.y).toBe(2);
		}
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
