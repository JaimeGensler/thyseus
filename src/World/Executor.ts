import { BigUintArray } from '../utils/BigUintArray';
import { vecUtils } from '../utils/vecUtils';
import {
	getSystemDependencies,
	getSystemIntersections,
	type Dependencies,
	type SystemDefinition,
} from '../Systems';
import type { World } from './World';

let nextId = 0;
export class Executor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: (Dependencies | undefined)[],
	) {
		const intersections = world.threads.queue(() =>
			getSystemIntersections(systems),
		);
		const dependencyMasks = world.threads.queue(() =>
			getSystemDependencies(systems, systemDependencies, intersections),
		);
		const local = world.threads.isMainThread
			? systems.reduce(
					(acc, val, i) =>
						val.parameters.some((param: any) =>
							param.isLocalToThread(),
						)
							? acc.add(i)
							: acc,
					new Set<number>(),
			  )
			: new Set<number>();

		const systemVec = world.threads.queue(
			// Storing current length
			() => new Uint16Array(world.createBuffer(2 * systems.length + 2)),
		);
		const status = new BigUintArray(
			systems.length,
			2,
			world.threads.queue(
				() =>
					new Uint8Array(
						world.createBuffer(
							BigUintArray.getBufferLength(systems.length, 2),
						),
					),
			),
		);
		const id = world.threads.queue(() => String(nextId++));

		return new this(
			intersections,
			dependencyMasks,
			systemVec,
			status,
			local,
			id,
		);
	}

	#channel = new BroadcastChannel('thyseus::executor');
	#signals = [] as ((val: any) => void)[];

	#intersections: bigint[];
	#dependencies: bigint[];
	#systemsToExecute: Uint16Array;
	#status: BigUintArray; // [ SystemsRunning, SystemsCompleted ]
	#local: Set<number>;
	#id: string;
	constructor(
		intersections: bigint[],
		dependencies: bigint[],
		systemsToExecute: Uint16Array,
		status: BigUintArray,
		local: Set<number>,
		id: string,
	) {
		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#systemsToExecute = systemsToExecute;
		this.#status = status;
		this.#local = local;
		this.#id = id;

		this.#channel.addEventListener('message', () => {
			this.#signals.forEach(s => s(0));
			this.#signals.length = 0;
		});
	}

	start() {
		this.#sendSignal();
	}
	reset() {
		this.#status.set(0, 0n);
		this.#status.set(1, 0n);
		for (let i = 0; i < this.#dependencies.length; i++) {
			if (!this.#local.has(i)) {
				vecUtils.push(this.#systemsToExecute, i);
			}
		}
	}

	#sendSignal() {
		this.#channel.postMessage(0);
		this.#signals.forEach(s => s(0));
		this.#signals.length = 0;
	}
	async #receiveSignal() {
		return new Promise(r => this.#signals.push(r));
	}

	async onReady(fn: () => void) {
		await this.#receiveSignal();
		fn();
	}

	async *[Symbol.asyncIterator]() {
		const local = new Set(this.#local);
		while (vecUtils.size(this.#systemsToExecute) + local.size > 0) {
			const size = vecUtils.size(this.#systemsToExecute);
			let runningSystem = -1;

			await navigator.locks.request(this.#id, () => {
				const active = this.#status.get(0);
				const deps = this.#status.get(1);
				for (const systemId of [
					...local,
					...vecUtils.iter(this.#systemsToExecute),
				]) {
					if (
						(active & this.#intersections[systemId]) === 0n &&
						(deps & this.#dependencies[systemId]) ===
							this.#dependencies[systemId]
					) {
						runningSystem = systemId;
						if (local.has(systemId)) {
							local.delete(systemId);
						} else {
							vecUtils.delete(
								this.#systemsToExecute,
								this.#systemsToExecute.indexOf(systemId),
							);
						}
						this.#status.OR(0, 1n << BigInt(systemId));
						break;
					}
				}
			});

			if (runningSystem > -1) {
				yield runningSystem;

				await navigator.locks.request(this.#id, () => {
					this.#status.XOR(0, 1n << BigInt(runningSystem));
					this.#status.OR(1, 1n << BigInt(runningSystem));
				});
				this.#sendSignal();
			} else if (size !== 0 || local.size !== 0) {
				await this.#receiveSignal();
			}
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	let channel: any;
	vi.stubGlobal(
		'BroadcastChannel',
		class {
			listeners = new Set<Function>();
			constructor() {
				if (!channel) {
					channel = this;
				}
				return channel;
			}

			addEventListener(_: 'message', listener: any) {
				this.listeners.add(listener);
			}
			removeEventListener(_: 'message', listener: any) {
				this.listeners.delete(listener);
			}
			postMessage() {
				setTimeout(() => this.listeners.forEach(l => l()), 10);
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

	const createExecutor = (i: bigint[], d: bigint[], l: Set<number>) =>
		new Executor(
			i,
			d,
			new Uint16Array(i.length + 1),
			new BigUintArray(
				i.length,
				2,
				new Uint8Array(BigUintArray.getBufferLength(i.length, 2)),
			),
			l,
			'',
		);

	it('calls whenReady callback when started', async () => {
		const exec = createExecutor(
			[0b110n, 0b000n, 0b000n],
			[0b000n, 0b000n, 0b000n],
			new Set(),
		);
		const spy = vi.fn();
		const promise = exec.onReady(spy);
		expect(spy).not.toHaveBeenCalled();
		exec.start();
		await promise;
		expect(spy).toHaveBeenCalled();
	});

	it('iterates all elements with no intersections, no dependencies)', async () => {
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
