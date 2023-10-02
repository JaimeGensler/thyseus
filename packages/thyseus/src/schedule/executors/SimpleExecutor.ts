import { getSystemDependencies } from './getSystemDependencies';
import { bits } from '../../utils';
import type { World } from '../../world';
import type { System } from '../../systems';
import type { SystemConfig } from '../run';

export class SimpleExecutor {
	static fromWorld(
		_: World,
		systems: (System | SystemConfig)[],
		systemArguments: any[][],
	): SimpleExecutor {
		const dependencies = getSystemDependencies(systems);

		const order = dependencies.reduce(function addSystem(acc, val, i) {
			for (const bit of bits(val)) {
				addSystem(acc, dependencies[bit], bit);
			}
			if (!acc.includes(i)) {
				acc.push(i);
			}
			return acc;
		}, [] as number[]);

		return new this(
			systems.map(s => (typeof s === 'function' ? s : s.system)),
			systemArguments,
			order,
		);
	}

	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	#systemOrder: number[];
	constructor(
		systems: System[],
		systemArguments: any[][],
		systemOrder: number[],
	) {
		this.#systems = systems;
		this.#arguments = systemArguments;
		this.#systemOrder = systemOrder;
	}

	get length() {
		return this.#systems.length;
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
	const { run } = await import('../run');

	const createOrderTracking = (length: number) => {
		const executionOrder: number[] = [];
		const systems = Array.from({ length }, (_, i) => {
			function mySystem() {
				executionOrder.push(i);
			}
			return mySystem;
		});
		return {
			executionOrder,
			systems,
			world: {} as any as World,
			args: systems.map(() => []),
		};
	};

	it('executes systems sequentially if unordered', async () => {
		const { systems, executionOrder, world } = createOrderTracking(5);
		const exec = SimpleExecutor.fromWorld(
			world,
			systems,
			systems.map(() => []),
		);
		await exec.start();
		expect(executionOrder).toStrictEqual([0, 1, 2, 3, 4]);
	});

	it('handles before/after ordering', async () => {
		const {
			systems: [a, b, c, d, e],
			executionOrder,
			world,
			args,
		} = createOrderTracking(5);
		const exec = SimpleExecutor.fromWorld(
			world,
			[run(a).after(d), run(b).before(a), c, run(d).after(e), e],
			args,
		);
		await exec.start();
		expect(executionOrder).toStrictEqual([1, 4, 3, 0, 2]);
	});

	it('handles a combination of all', async () => {
		const {
			systems: [a, b, c, d, e, f],
			executionOrder,
			world,
			args,
		} = createOrderTracking(6);
		const exec = SimpleExecutor.fromWorld(
			world,
			[a, run(b).after(a), c, run(d).before(c), run(e).before(f), f],
			args,
		);
		await exec.start();
		expect(executionOrder).toStrictEqual([0, 1, 3, 2, 4, 5]);
	});
}