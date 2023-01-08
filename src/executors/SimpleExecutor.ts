import { getSystemDependencies } from './getSystemDependencies';
import { getSystemIntersections } from './getSystemIntersections';
import { bits } from '../utils/bits';
import type { SystemDefinition } from '../systems';
import type { World } from '../world';

export class SimpleExecutor {
	static fromWorld(world: World, systems: SystemDefinition[]) {
		const dependencies = getSystemDependencies(
			systems,
			getSystemIntersections(systems),
		);

		const order = dependencies.reduce(function addSystem(acc, val, i) {
			for (const bit of bits(val)) {
				addSystem(acc, dependencies[bit], bit);
			}
			if (!acc.includes(i)) {
				acc.push(i);
			}
			return acc;
		}, [] as number[]);

		return new this(world, order);
	}

	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	#systemOrder: number[];
	constructor(world: World, dependencies: number[]) {
		this.#systems = world.systems;
		this.#arguments = world.arguments;
		this.#systemOrder = dependencies;
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
	const { it, expect } = import.meta.vitest;
	const { SystemDefinition } = await import('../systems/SystemDefinition');

	const createOrderTracking = (length: number) => {
		const order: number[] = [];
		const systems = Array.from(
			{ length },
			(_, i) =>
				new SystemDefinition(
					() => [{ intersectsWith: () => true } as any],
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
		await exec.start();
		expect(order).toStrictEqual([1, 4, 3, 0, 2]);
	});

	it('handles beforeAll', async () => {
		const { systems, order, world } = createOrderTracking(5);
		systems[1].before(systems[3]);
		systems[3].beforeAll();
		const exec = SimpleExecutor.fromWorld(world, systems);
		await exec.start();
		expect(order).toStrictEqual([1, 3, 0, 2, 4]);
	});

	it('handles afterAll', async () => {
		const { systems, order, world } = createOrderTracking(5);
		systems[1].after(systems[3]);
		systems[3].afterAll();
		const exec = SimpleExecutor.fromWorld(world, systems);
		await exec.start();
		expect(order).toStrictEqual([0, 2, 4, 3, 1]);
	});

	it('handles a combination of all', async () => {
		const { systems, order, world } = createOrderTracking(6);
		systems[0].afterAll();
		systems[5].beforeAll();
		systems[1].after(systems[0]);
		systems[4].before(systems[5]);
		systems[3].before(systems[2]);
		const exec = SimpleExecutor.fromWorld(world, systems);
		await exec.start();
		expect(order).toStrictEqual([4, 5, 3, 2, 0, 1]);
	});
}
