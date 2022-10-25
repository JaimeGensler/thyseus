import { getSystemDependencies, getSystemIntersections } from '../Systems';
import { BigUintArray, Mutex } from '../utils/DataTypes';
import type { ThreadGroup } from '../utils/ThreadGroup';
import { vecUtils } from '../utils/vecUtils';
import type { WorldBuilder } from './WorldBuilder';

export class Executor {
	static async fromWorld(
		world: WorldBuilder,
		threads: ThreadGroup,
	): Promise<Executor> {
		const intersections = await threads.sendOrReceive(() =>
			getSystemIntersections(world.systems),
		);
		const dependencies = await threads.sendOrReceive(() =>
			getSystemDependencies(
				world.systems,
				world.systemDependencies,
				intersections,
			),
		);
		const local = threads.isMainThread
			? world.systems.reduce(
					(acc, val, i) =>
						val.parameters.some(param => param.isLocalToThread())
							? acc.add(i)
							: acc,
					new Set<number>(),
			  )
			: new Set<number>();

		const systems = await threads.sendOrReceive(
			// Storing current length
			() => new Uint16Array(world.createBuffer(world.systems.length + 2)),
		);
		const lock = new Mutex(
			new BigUintArray(
				world.systems.length,
				2,
				await threads.sendOrReceive(
					() =>
						new Uint8Array(
							BigUintArray.getBufferLength(
								world.systems.length,
								2,
							),
						),
				),
			),
			await threads.sendOrReceive(() => Mutex.getId()),
		);

		return new Executor(intersections, dependencies, systems, lock, local);
	}

	#signal: Int32Array;

	#intersections: bigint[];
	#dependencies: bigint[];
	#systemsToExecute: Uint16Array;
	#lock: Mutex<BigUintArray>; // [ SystemsRunning, SystemsCompleted ]
	#local: Set<number>;
	constructor(
		intersections: bigint[],
		dependencies: bigint[],
		systemsToExecute: Uint16Array,
		lock: Mutex<BigUintArray>,
		local: Set<number>,
	) {
		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#systemsToExecute = systemsToExecute;
		this.#lock = lock;
		// TODO: Fix signal - this was based on the metadata of SparseSets
		this.#signal = new Int32Array(0);
		this.#local = local;
	}

	add(system: number) {
		vecUtils.push(this.#systemsToExecute, system);
	}
	start() {
		Atomics.notify(this.#signal, 0);
	}
	reset() {
		const status = this.#lock.UNSAFE_getData();
		status.set(0, 0n);
		status.set(1, 0n);
		for (let i = 0; i < this.#dependencies.length; i++) {
			if (!this.#local.has(i)) {
				vecUtils.push(this.#systemsToExecute, i);
			}
		}
	}

	async onReady(fn: () => void) {
		const { async, value } = Atomics.waitAsync(this.#signal, 0, 0 as any);
		if (!async) {
			throw new Error(
				'Trying to wait while there are still systems to execute',
			);
		}
		await value;
		fn();
	}

	async *[Symbol.asyncIterator]() {
		const local = new Set(this.#local);
		while (vecUtils.size(this.#systemsToExecute) + local.size > 0) {
			const size = vecUtils.size(this.#systemsToExecute);
			let runningSystem = -1;

			await this.#lock.request(status => {
				const active = status.get(0);
				const deps = status.get(1);
				for (const systemId of [...local, ...this.#systemsToExecute]) {
					if (
						(active & this.#intersections[systemId]) === 0n &&
						(deps & this.#dependencies[systemId]) ===
							this.#dependencies[systemId]
					) {
						runningSystem = systemId;
						vecUtils.delete(this.#systemsToExecute, systemId);
						local.delete(systemId);
						status.OR(0, 1n << BigInt(systemId));
						break;
					}
				}
			});

			if (runningSystem > -1) {
				yield runningSystem;

				await this.#lock.request(status => {
					status.XOR(0, 1n << BigInt(runningSystem));
					status.OR(1, 1n << BigInt(runningSystem));
					if (
						this.#signal[0] !== 0 ||
						(this.#signal[0] === 0 && status.get(0) === 0n)
					) {
						Atomics.notify(this.#signal, 0);
					}
				});
			} else if (size !== 0) {
				await Atomics.waitAsync(this.#signal, 0, size as any).value;
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

	const createExecutor = (i: bigint[], d: bigint[], l: Set<number>) =>
		new Executor(
			i,
			d,
			new Uint16Array(i.length + 1),
			new Mutex(
				new BigUintArray(
					i.length,
					2,
					new Uint8Array(BigUintArray.getBufferLength(i.length, 2)),
				),
			),
			l,
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
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const visited: number[] = [];
		for await (const id of exec) {
			expect(visited).not.toContain(id);
			visited.push(id);
		}
		for (let i = 0; i < 4; i++) {
			expect(visited).toContain(i);
		}
	});

	it('iterates elements with intersections', async () => {
		const exec = createExecutor(
			[0b1000n, 0b0000n, 0b0000n, 0b0001n],
			emptyMask,
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		let res1 = await iter1.next();
		let res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);
		res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);

		// iter2.next() is called first but is waiting on intersections to resolve.
		// iter1.next() resolves the intersection and is able grab the final system.
		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
		]);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
	});

	it('iterates elements with dependencies', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		let res1 = await iter1.next();
		let res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);
		res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);

		// iter2.next() is called first but is waiting on dependencies to finish.
		// iter1.next() completes the dependency and is able grab the final system.
		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
		]);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
	});

	it('does not run callbacks in whenReady queue when iterating', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		await iter1.next();
		await iter2.next();
		await iter2.next();

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
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
