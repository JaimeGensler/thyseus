import { defineSystem } from '../systems/defineSystem';

export const applyCommands = defineSystem(
	({ World }) => [World()],
	function applyCommands(world) {
		world.entities.resetCursor();

		for (const [entityId, tableId] of world.commands.getDestinations()) {
			world.moveEntity(entityId, tableId);
		}

		for (const { entityId, componentId, dataStart } of world.commands) {
			const tableId = world.entities.getTableIndex(entityId);
			if (tableId === 0 || tableId === 1) {
				continue;
			}
			world.archetypes[tableId].copyComponentIntoRow(
				world.entities.getRow(entityId),
				world.components[componentId],
				dataStart,
			);
		}

		world.commands.reset();
	},
);

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { initStruct } = await import('../storage');
	const { World } = await import('../world/World');
	const { memory } = await import('../utils/memory');
	const { ThreadGroup } = await import('../threads');
	ThreadGroup.isMainThread = true;

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

		declare __$$s: any;
		declare __$$b: number;
		get x() {
			return this.__$$s.u32[this.__$$b >> 2];
		}
		get y() {
			return this.__$$s.u32[(this.__$$b >> 2) + 1];
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

	const createWorld = () =>
		World.new()
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
		await applyCommands.fn(myWorld);
		expect(moveEntitySpy).toHaveBeenCalledTimes(2);
		expect(moveEntitySpy).toHaveBeenCalledWith(0n, 0b100101n);
		expect(moveEntitySpy).toHaveBeenCalledWith(1n, 0b101011n);
	});

	it('initializes data', async () => {
		const myWorld = await createWorld();
		myWorld.commands.spawn().addType(CompA).add(new CompD(1, 2));
		await applyCommands.fn(myWorld);
		const archetypeD = myWorld.archetypes[2];
		const testComp = new CompD();

		testComp.__$$s = memory.views;
		testComp.__$$b = archetypeD.getColumn(CompD)!;
		expect(archetypeD.size).toBe(1);
		expect(testComp.x).toBe(1);
		expect(testComp.y).toBe(2);
	});
}
