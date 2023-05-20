import { Memory } from '../../utils/Memory';
import { getSystemIntersections } from './getSystemIntersections';
import { getSystemDependencies } from './getSystemDependencies';
import { overlaps } from './overlaps';
import type { SystemConfig } from '../run';
import type { System } from '../../systems';
import type { World } from '../../world';

let nextId = 0;
const noop = (...args: any[]) => {};

export class ParallelExecutor {
	static fromWorld(
		world: World,
		systems: (System | SystemConfig)[],
		systemArguments: any[][],
	): ParallelExecutor {
		const sys = systems.map(s => (typeof s === 'function' ? s : s.system));

		const intersections = world.threads.queue(() =>
			getSystemIntersections(sys),
		);
		const dependencies = world.threads.queue(() =>
			getSystemDependencies(systems),
		);
		const locallyAvailable = world.threads.isMainThread
			? systems.map(() => true)
			: systems.map(s => {
					const system = typeof s === 'function' ? s : s.system;
					if (!system.parameters) {
						return true;
					}
					return system.parameters.every(
						parameter => !parameter.isLocalToThread(),
					);
			  });

		const { buffer } = Memory.views;
		const pointer = world.threads.queue(() =>
			Memory.alloc(8 + systems.length * 3),
		);
		const lockName = world.threads.queue(
			() => `thyseus::ParallelExecutor${nextId++}`,
		);

		return new this(
			world,
			sys,
			systemArguments,
			new Uint32Array(buffer, pointer, 2),
			new Uint8Array(buffer, pointer + 8, systems.length),
			new Uint8Array(
				buffer,
				pointer + 8 + systems.length,
				systems.length,
			),
			new Uint8Array(
				buffer,
				pointer + 8 + systems.length * 2,
				systems.length,
			),
			intersections,
			dependencies,
			locallyAvailable,
			lockName,
		);
	}

	#resolveExecutionChange = noop;
	#resolveExecutionComplete = noop;

	#status: Uint32Array;
	#toExecuteSystems: Uint8Array;
	#executingSystems: Uint8Array;
	#completedSystems: Uint8Array;

	#locallyAvailable: boolean[];
	#intersections: bigint[];
	#dependencies: bigint[];

	#lockName: string;
	#channel: BroadcastChannel;
	#isMainThread: boolean;

	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	constructor(
		world: World,
		systems: System[],
		systemArguments: any[][],
		status: Uint32Array, // [ needingExecution, completedExecution ]
		toExecuteSystems: Uint8Array,
		executingSystems: Uint8Array,
		completedSystems: Uint8Array,
		intersections: bigint[],
		dependencies: bigint[],
		locallyAvailable: boolean[],
		lockName: string,
	) {
		this.#systems = systems;
		this.#arguments = systemArguments;
		this.#isMainThread = world.threads.isMainThread;

		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#locallyAvailable = locallyAvailable;

		this.#status = status;
		this.#toExecuteSystems = toExecuteSystems;
		this.#executingSystems = executingSystems;
		this.#completedSystems = completedSystems;

		this.#channel = new BroadcastChannel(lockName);

		this.#lockName = lockName;

		this.#channel.addEventListener(
			'message',
			({ data }: MessageEvent<0 | 1 | 2>) => {
				if (data === 0) {
					this.#runSystems();
				} else if (data === 1) {
					this.#resolveExecutionChange();
					this.#resolveExecutionChange = noop;
				} else {
					this.#resolveExecutionComplete();
					this.#resolveExecutionComplete = noop;
				}
			},
		);
	}

	get length() {
		return this.#systems.length;
	}

	async start() {
		this.#systemsRemaining = this.#systems.length;
		this.#status[1] = 0;
		this.#toExecuteSystems.fill(1);
		this.#completedSystems.fill(0);
		this.#executingSystems.fill(0);
		this.#startOnAllThreads();
		return this.#runSystems();
	}
	get #systemsRemaining() {
		return this.#status[0];
	}
	set #systemsRemaining(val: number) {
		this.#status[0] = val;
	}

	async #runSystems() {
		while (this.#systemsRemaining > 0) {
			let systemId = -1;
			await navigator.locks.request(this.#lockName, () => {
				// prettier-ignore
				systemId = this.#toExecuteSystems.findIndex((isSet, id) =>
					!!isSet &&
					overlaps(this.#completedSystems, this.#dependencies[id], 0) &&
					overlaps(this.#executingSystems, this.#intersections[id], 1) &&
					this.#locallyAvailable[id],
				);
				if (systemId !== -1) {
					this.#toExecuteSystems[systemId] = 0;
					this.#executingSystems[systemId] = 1;
					this.#systemsRemaining--;
				}
			});

			if (systemId === -1) {
				await this.#awaitExecutionChange();
				continue;
			}
			await this.#systems[systemId](...this.#arguments[systemId]);
			await navigator.locks.request(this.#lockName, () => {
				this.#executingSystems[systemId] = 0;
				this.#completedSystems[systemId] = 1;
				Atomics.add(this.#status, 1, 1);
			});
			this.#alertExecutionChange();
		}
		if (
			this.#isMainThread &&
			Atomics.load(this.#status, 1) !== this.#systems.length
		) {
			await this.#awaitExecutionComplete();
		}
	}

	#startOnAllThreads() {
		this.#channel.postMessage(0);
	}
	#alertExecutionChange() {
		if (Atomics.load(this.#status, 1) === this.#systems.length) {
			this.#channel.postMessage(2);
		} else {
			this.#channel.postMessage(1);
		}
	}

	async #awaitExecutionChange() {
		return new Promise(r => (this.#resolveExecutionChange = r));
	}
	async #awaitExecutionComplete() {
		return new Promise(r => (this.#resolveExecutionComplete = r));
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach, afterEach } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	const cbs = [] as any[];
	beforeEach(() => {
		Memory.UNSAFE_CLEAR_ALL();
	});
	afterEach(() => {
		cbs.length = 0;
	});
	vi.stubGlobal(
		'BroadcastChannel',
		class {
			id = 0;
			addEventListener(_: 'message', listener: any) {
				this.id = cbs.push(listener) - 1;
			}
			postMessage(data: any) {
				cbs.forEach((l, id) => {
					if (id !== this.id) {
						l({ data });
					}
				});
			}
		},
	);
	vi.stubGlobal('navigator', {
		locks: {
			async request(_: any, cb: () => void) {
				await Promise.resolve();
				cb();
			},
		},
	});

	const createArrs = (l: number) =>
		[
			new Uint32Array(2),
			new Uint8Array(l),
			new Uint8Array(l),
			new Uint8Array(l),
		] as [Uint32Array, Uint8Array, Uint8Array, Uint8Array];
	const createExecutor = (
		i: bigint[],
		d: bigint[],
		l: boolean[],
		systems: ((...args: any[]) => any)[],
		args: any[][],
		arrs = createArrs(systems.length),
		isMainThread = true,
	) =>
		new ParallelExecutor(
			{
				systems,
				arguments: args,
				threads: {
					id: 0,
					isMainThread,
				},
			} as any,
			systems,
			args,
			...arrs,
			i,
			d,
			l,
			'lock',
		);

	it('executes all systems with no intersections, no dependencies', async () => {
		const systems = [vi.fn(), vi.fn(), vi.fn()];
		const args = [[1], [2], [3]];
		const exec = createExecutor(
			emptyMask,
			emptyMask,
			[true, true, true],
			systems,
			args,
		);
		for (const sys of systems) {
			expect(sys).not.toHaveBeenCalled();
		}
		await exec.start();

		for (let i = 0; i < systems.length; i++) {
			expect(systems[i]).toHaveBeenCalledTimes(1);
			expect(systems[i]).toHaveBeenCalledWith(...args[i]);
		}
	});

	it('executes systems with intersections', async () => {
		let resolver: any = () => {};
		const order: number[] = [];
		const systems = [
			async () => {
				order.push(0);
				await new Promise(r => (resolver = r));
			},
			() => order.push(1),
			() => {
				resolver();
				order.push(2);
			},
		];
		const arrs = createArrs(systems.length);
		const exec1 = createExecutor(
			[0b0010n, 0b0001n, 0b0000n],
			emptyMask,
			systems.map(() => true),
			systems,
			systems.map(() => []),
			arrs,
			true,
		);
		const exec2 = createExecutor(
			[0b0010n, 0b0001n, 0b0000n],
			emptyMask,
			systems.map(() => true),
			systems,
			systems.map(() => []),
			arrs,
			false,
		);
		await exec1.start();

		expect(order).toStrictEqual([0, 2, 1]);
	});

	it('executes systems with dependencies', async () => {
		const order: number[] = [];
		const systems = [
			() => order.push(0),
			() => order.push(1),
			() => order.push(2),
			() => order.push(3),
		];
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0100n, 0b1000n, 0b0000n],
			systems.map(() => true),
			systems,
			systems.map(() => []),
		);
		await exec.start();

		expect(order).toStrictEqual([0, 3, 2, 1]);
	});

	it('does not execute locally unavailable systems', async () => {
		const systems = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
		const arrs = createArrs(systems.length);
		const exec1 = createExecutor(
			emptyMask,
			emptyMask,
			[false, false, true, true],
			systems,
			[[1], [1], [1], [1]],
			arrs,
			true,
		);
		const exec2 = createExecutor(
			emptyMask,
			emptyMask,
			[true, true, false, false],
			systems,
			[[2], [2], [2], [2]],
			arrs,
			false,
		);
		await exec1.start();
		expect(systems[0]).toHaveBeenCalledTimes(1);
		expect(systems[1]).toHaveBeenCalledTimes(1);
		expect(systems[2]).toHaveBeenCalledTimes(1);
		expect(systems[3]).toHaveBeenCalledTimes(1);
		expect(systems[0]).toHaveBeenCalledWith(2);
		expect(systems[1]).toHaveBeenCalledWith(2);
		expect(systems[2]).toHaveBeenCalledWith(1);
		expect(systems[3]).toHaveBeenCalledWith(1);
	});

	it('does not resolve until all systems have completed execution', async () => {
		let hasFinalPromiseResolved = false;

		const systems = [
			() => {},
			async () => {
				return new Promise(r => setTimeout(r, 1000)).then(() => {
					hasFinalPromiseResolved = true;
				});
			},
		];
		const arrs = createArrs(systems.length);
		const exec1 = createExecutor(
			emptyMask,
			emptyMask,
			[true, false],
			systems,
			[[], []],
			arrs,
			true,
		);
		const exec2 = createExecutor(
			emptyMask,
			emptyMask,
			[false, true],
			systems,
			[[], []],
			arrs,
			false,
		);
		await exec1.start();
		// The timeout is so long that this would have found the opportunity
		// to resolve if it wasn't waiting on the final system
		// But it can't resolve, because we're waiting on all systems to finish!
		expect(hasFinalPromiseResolved).toBe(true);
	});
}
