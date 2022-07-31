import BigUintArray from '../../DataTypes/BigUintArray';
import Mutex from '../../DataTypes/Mutex';
import Thread from '../../utils/Thread';
import SparseSet from '../../DataTypes/SparseSet';
import Executor from './type';

export default class MultiExecutor implements Executor {
	static from(intersections: bigint[], dependencies: bigint[]) {
		return new this(
			intersections,
			dependencies,
			SparseSet.with(intersections.length, true),
			new Mutex(BigUintArray.with(intersections.length, 2, true)),
		);
	}

	#signal: Int32Array;

	#intersections: bigint[];
	#dependencies: bigint[];
	#systemsToExecute: SparseSet;
	#lock: Mutex<BigUintArray>; // [ SystemsRunning, SystemsCompleted ]
	constructor(
		intersections: bigint[],
		dependencies: bigint[],
		systemsToExecute: SparseSet,
		lock: Mutex<BigUintArray>,
	) {
		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#systemsToExecute = systemsToExecute;
		this.#lock = lock;
		this.#signal = new Int32Array(
			systemsToExecute[Thread.Send]()[2].buffer,
		);
	}

	add(system: number) {
		this.#systemsToExecute.add(system);
	}
	start() {
		Atomics.notify(this.#signal, 0);
	}
	reset() {
		const status = this.#lock.UNSAFE_getData();
		status.set(0, 0n);
		status.set(1, 0n);
	}

	async onReady(fn: () => void) {
		const { async, value } = Atomics.waitAsync(this.#signal, 0, 0);
		if (!async) {
			throw new Error(
				'Trying to wait while there are still systems to execute',
			);
		}
		await value;
		fn();
	}

	async *iter(additional: Set<number>) {
		while (this.#systemsToExecute.size + additional.size > 0) {
			const size = this.#systemsToExecute.size;
			let runningSystem = -1;

			await this.#lock.request(status => {
				const active = status.get(0);
				const deps = status.get(1);
				for (const systemId of [
					...additional,
					...this.#systemsToExecute,
				]) {
					if (
						(active & this.#intersections[systemId]) === 0n &&
						(deps & this.#dependencies[systemId]) ===
							this.#dependencies[systemId]
					) {
						runningSystem = systemId;
						this.#systemsToExecute.delete(systemId);
						additional.delete(systemId);
						status.orEquals(0, 1n << BigInt(systemId));
						break;
					}
				}
			});

			if (runningSystem > -1) {
				yield runningSystem;

				await this.#lock.request(status => {
					status.xorEquals(0, 1n << BigInt(runningSystem));
					status.orEquals(1, 1n << BigInt(runningSystem));
					if (
						this.#signal[0] !== 0 ||
						(this.#signal[0] === 0 && status.get(0) === 0n)
					) {
						Atomics.notify(this.#signal, 0);
					}
				});
			} else if (size !== 0) {
				await Atomics.waitAsync(this.#signal, 0, size).value;
			}
		}
	}

	[Thread.Send](): SerializedExecutor {
		return [
			this.#intersections,
			this.#dependencies,
			this.#systemsToExecute,
			this.#lock,
		];
	}
	static [Thread.Receive](data: SerializedExecutor) {
		return new this(...data);
	}
}
type SerializedExecutor = [
	intersections: bigint[],
	dependencies: bigint[],
	systemsToExecute: SparseSet,
	lock: Mutex<BigUintArray>,
];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	it('calls whenReady callback when started', async () => {
		const exec = MultiExecutor.from(
			[0b110n, 0b000n, 0b000n],
			[0b000n, 0b000n, 0b000n],
		);
		const spy = vi.fn();
		const promise = exec.onReady(spy);
		expect(spy).not.toHaveBeenCalled();
		exec.start();
		await promise;
		expect(spy).toHaveBeenCalled();
	});

	it('iterates all elements with no intersections, no dependencies)', async () => {
		const exec = MultiExecutor.from(emptyMask, emptyMask);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const visited: number[] = [];
		for await (const id of exec.iter(new Set())) {
			expect(visited).not.toContain(id);
			visited.push(id);
		}
		for (let i = 0; i < 4; i++) {
			expect(visited).toContain(i);
		}
	});

	it('iterates elements with intersections', async () => {
		const exec = MultiExecutor.from(
			[0b1000n, 0b0000n, 0b0000n, 0b0001n],
			emptyMask,
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec.iter(new Set());
		const iter2 = exec.iter(new Set());
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
		const exec = MultiExecutor.from(emptyMask, [
			0b0000n,
			0b0000n,
			0b0000n,
			0b0001n,
		]);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec.iter(new Set());
		const iter2 = exec.iter(new Set());
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
		const exec = MultiExecutor.from(emptyMask, [
			0b0000n,
			0b0000n,
			0b0000n,
			0b0001n,
		]);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec.iter(new Set());
		const iter2 = exec.iter(new Set());
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
