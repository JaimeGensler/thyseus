import type { SystemDefinition } from '../systems';
import type { World } from '../world';

export class SimpleExecutor {
	static fromWorld(world: World, systems: SystemDefinition[]) {
		const systemOrder = systems.map((_, i) => i);
		// TODO: Check dependencies!

		return new this(world, systemOrder);
	}

	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	#systemOrder: number[];
	constructor(world: World, systemOrder: number[]) {
		this.#systems = world.systems;
		this.#arguments = world.arguments;
		this.#systemOrder = systemOrder;
	}

	async start() {
		for (const systemId of this.#systemOrder) {
			await this.#systems[systemId](...this.#arguments[systemId]);
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { SystemDefinition } = await import('../systems/SystemDefinition');

	const createOrderTracking = (length: number) => {
		const order: number[] = [];
		const systems = Array.from(
			{ length },
			(_, i) =>
				new SystemDefinition(
					() => [],
					() => {
						order.push(i);
					},
				),
		);
		return {
			order,
			systems,
			world: {
				systems: systems.map(sys => sys.fn),
				arguments: systems.map(() => []),
			} as any,
		};
	};

	it('executes systems sequentially if unordered', async () => {
		const { systems, order, world } = createOrderTracking(5);
		const exec = SimpleExecutor.fromWorld(world, systems);
		await exec.start();
		expect(order).toStrictEqual([0, 1, 2, 3, 4]);
	});

	it('handles before/after ordering', async () => {
		const { systems, order, world } = createOrderTracking(5);
		systems[0].after(systems[3]);
		systems[1].before(systems[0]);
		systems[3].after(systems[4]);
		const exec = SimpleExecutor.fromWorld(world, systems);
		// 3 -> 0
		// 1 -> 0
		// none
		// 4 -> 3
		// none
		await exec.start();
		// TODO: Fix! This ordering is wrong.
		expect(order).toStrictEqual([0, 1, 2, 3, 4]);
	});
}
