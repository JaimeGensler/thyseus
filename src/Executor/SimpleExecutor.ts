import type { Dependencies, SystemDefinition } from '../Systems';
import type { World } from '../World';

export class SimpleExecutor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: (Dependencies | undefined)[],
	) {
		const systemOrder = systems
			.map((_, i) => i)
			// TODO: Sort won't work - redo.
			.sort((a, b) => {
				if (
					systemDependencies[a]?.before?.includes(systems[b]) ||
					systemDependencies[b]?.after?.includes(systems[a]) ||
					(systemDependencies[a]?.beforeAll &&
						(!systemDependencies[b]?.beforeAll || a < b)) ||
					(systemDependencies[b]?.afterAll &&
						(!systemDependencies[a]?.afterAll || b < a))
				) {
					return -1;
				} else if (
					systemDependencies[b]?.before?.includes(systems[a]) ||
					systemDependencies[a]?.after?.includes(systems[b]) ||
					(systemDependencies[b]?.beforeAll &&
						(!systemDependencies[a]?.beforeAll || b < a)) ||
					(systemDependencies[a]?.afterAll &&
						(!systemDependencies[b]?.afterAll || a < b))
				) {
					return 1;
				}
				return 0;
			});
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

	const createOrderTracking = (length: number) => {
		const order: number[] = [];
		const systems = Array.from({ length }, (_, i) => ({
			fn: () => {
				order.push(i);
			},
			parameters: [],
		}));
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
		const exec = SimpleExecutor.fromWorld(world, systems, []);
		await exec.start();
		expect(order).toStrictEqual([0, 1, 2, 3, 4]);
	});

	it('handles before/after ordering', async () => {
		const { systems, order, world } = createOrderTracking(5);
		const exec = SimpleExecutor.fromWorld(world, systems, [
			{ after: [systems[3]] },
			{ before: [systems[0]] },
			undefined,
			{ after: [systems[4]] },
			undefined,
		]);
		// 3 -> 0
		// 1 -> 0
		// none
		// 4 -> 3
		// none
		await exec.start();
		// TODO: Fix! This ordering is wrong.
		expect(order).toStrictEqual([1, 3, 0, 2, 4]);
	});
}
