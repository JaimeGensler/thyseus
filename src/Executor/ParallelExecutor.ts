import { createThreadChannel } from '../threads/createThreadChannel';
import { getSystemIntersections } from './getSystemIntersections';
import { getSystemDependencies } from './getSystemDependencies';
import type { Dependencies, SystemDefinition } from '../Systems';
import type { World } from '../World';
import type { ThreadGroup } from '../threads/ThreadGroup';
import { FixedBitSet } from './FixedBitSet';

let nextId = 0;
const noop = (...args: any[]) => {};
const executorChannel = createThreadChannel(
	'thyseus::ParallelExecutor',
	() => (val: 0 | 1) => {},
);

export class ParallelExecutor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: (Dependencies | undefined)[],
	) {
		const intersections = world.threads.queue(() =>
			getSystemIntersections(systems),
		);
		const dependencies = world.threads.queue(() =>
			getSystemDependencies(systems, systemDependencies, intersections),
		);
		const locallyAvailable = world.threads.isMainThread
			? systems.map(() => true)
			: systems.map(s => !s.parameters.some(p => p.isLocalToThread()));

		const bufferLength = FixedBitSet.getBufferLength(systems.length);
		return new this(
			world,
			new FixedBitSet(
				systems.length,
				world.threads.queue(() => world.createBuffer(bufferLength)),
			),
			new FixedBitSet(
				systems.length,
				world.threads.queue(() => world.createBuffer(bufferLength)),
			),
			new FixedBitSet(
				systems.length,
				world.threads.queue(() => world.createBuffer(bufferLength)),
			),
			intersections,
			dependencies,
			locallyAvailable,
			`${executorChannel.channelName}${nextId++}`,
		);
	}

	#resolver = noop;
	#executingSystems: FixedBitSet;
	#completedSystems: FixedBitSet;
	#toExecuteSystems: FixedBitSet;

	#locallyAvailable: boolean[];
	#intersections: bigint[];
	#dependencies: bigint[];

	#lockName: string;

	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	#threads: ThreadGroup;
	constructor(
		world: World,
		executingSystems: FixedBitSet,
		completedSystems: FixedBitSet,
		toExecuteSystems: FixedBitSet,
		intersections: bigint[],
		dependencies: bigint[],
		locallyAvailable: boolean[],
		lockName: string,
	) {
		this.#systems = world.systems;
		this.#arguments = world.arguments;
		this.#threads = world.threads;

		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#locallyAvailable = locallyAvailable;

		this.#executingSystems = executingSystems;
		this.#completedSystems = completedSystems;
		this.#toExecuteSystems = toExecuteSystems;

		this.#lockName = lockName;

		this.#threads.setListener(executorChannel.channelName, (val: 0 | 1) => {
			if (val === 0) {
				this.#runSystems();
			} else {
				this.#resolver();
				this.#resolver = noop;
			}
		});
	}

	async start() {
		this.#startOnAllThreads();
		return this.#runSystems();
	}

	async #runSystems() {
		while (this.#toExecuteSystems.setBitCount > 0) {
			let systemId = -1;
			await navigator.locks.request(this.#lockName, () => {
				// prettier-ignore
				systemId = this.#toExecuteSystems.find(id =>
					this.#completedSystems.overlaps(this.#dependencies[id]) &&
					this.#executingSystems.overlaps(this.#intersections[id]) &&
					this.#locallyAvailable[id],
				);
				if (systemId !== -1) {
					this.#toExecuteSystems.clear(systemId);
					this.#executingSystems.set(systemId);
				}
			});

			if (systemId === -1) {
				await this.#awaitExecutingSystemsChanged();
				continue;
			}
			await this.#systems[systemId](...this.#arguments[systemId]);
			await navigator.locks.request(this.#lockName, () => {
				this.#executingSystems.clear(systemId);
				this.#completedSystems.set(systemId);
			});
			this.#alertExecutingSystemsChanged();
		}
	}

	#startOnAllThreads() {
		this.#threads.send(executorChannel(0));
	}
	#alertExecutingSystemsChanged() {
		this.#threads.send(executorChannel(1));
	}
	async #awaitExecutingSystemsChanged() {
		return new Promise(r => (this.#resolver = r));
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	vi.stubGlobal('navigator', {
		locks: {
			async request(_: any, cb: () => void) {
				await Promise.resolve();
				cb();
			},
		},
	});

	const createExecutor = (
		i: bigint[],
		d: bigint[],
		l: Set<number>,
		systems: ((...args: any[]) => any)[],
		args: any[],
	) => new ParallelExecutor();
	// { systems, arguments: args } as any,
	// i,
	// d,
	// new Uint16Array(i.length + 1),
	// // new BigUintArray(
	// // 	i.length,
	// // 	2,
	// // 	new Uint8Array(BigUintArray.getBufferLength(i.length, 2)),
	// // ),
	// l,
	// '',

	it.only('calls a systems when started', async () => {
		const spy = vi.fn();
		const args = [1, {}, 3];
		const exec = createExecutor(
			[0b110n, 0b000n, 0b000n],
			[0b000n, 0b000n, 0b000n],
			new Set(),
			[spy],
			[args],
		);
		await exec.start();
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(...args);
	});

	it('iterates all elements with no intersections, no dependencies', async () => {
		const exec = createExecutor(emptyMask, emptyMask, new Set());
		exec.reset();

		const visited: number[] = [];
		for await (const id of exec) {
			expect(visited).not.toContain(id);
			visited.push(id);
		}
		for (let i = 0; i < 4; i++) {
			expect(visited).toContain(i);
		}
		expect(visited).toStrictEqual([0, 3, 2, 1]);
	});

	it('iterates elements with intersections', async () => {
		const exec = createExecutor(
			// Last element will move to first and so would normally be next,
			// but intersection prevents it from running from happening
			[0b1000n, 0b0000n, 0b0000n, 0b0001n],
			emptyMask,
			new Set(),
		);
		exec.reset();

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();

		let res1 = await iter1.next();
		expect(res1.value).toBe(0);

		// Would normally be 3, but can't because it's held.
		let res2 = await iter2.next();
		expect(res2.value).toBe(1);

		res2 = await iter2.next();
		expect(res2.value).toBe(2);

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: 3, done: false },
			{ value: undefined, done: true },
		]);
	});

	it('iterates elements with dependencies', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0110n],
			new Set(),
		);
		exec.reset();

		const iter = exec[Symbol.asyncIterator]();
		expect((await iter.next()).value).toBe(0);

		// Would normally be 3, but can't because 1 hasn't run yet
		expect((await iter.next()).value).toBe(1);

		// Would normally be 3, but can't because 2 hasn't run yet
		expect((await iter.next()).value).toBe(2);

		expect((await iter.next()).value).toBe(3);

		expect((await iter.next()).done).toBe(true);
	});

	it('does not run callbacks in whenReady queue when iterating', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		exec.reset();

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		await iter1.next();
		await iter2.next();
		await iter2.next();

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: 3, done: false },
			{ value: undefined, done: true },
		]);

		const spy = vi.fn();
		exec.onReady(spy);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
		await Promise.resolve();
		expect(spy).not.toHaveBeenCalled();
	});
}
