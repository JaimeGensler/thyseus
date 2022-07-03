import BigUintArray from '../../DataTypes/BigUintArray';
import Mutex from '../../DataTypes/Mutex';
import Thread from '../../utils/Thread';
import SparseSet from '../../DataTypes/SparseSet';
import Executor from './type';

export default class MultiExecutor implements Executor {
	#intersections: bigint[];
	#status: BigUintArray;
	#systemsToExecute: SparseSet;
	#lock: Mutex;
	#signal: Int32Array;

	static from(intersections: bigint[]) {
		return new this(
			intersections,
			BigUintArray.with(intersections.length, 1, true),
			SparseSet.with(intersections.length, true),
			new Mutex(),
		);
	}

	constructor(
		intersections: bigint[],
		status: BigUintArray,
		systemsToExecute: SparseSet,
		lock: Mutex,
	) {
		this.#status = status;
		this.#systemsToExecute = systemsToExecute;
		this.#intersections = intersections;
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

	async whenReady(fn: () => void) {
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

			await this.#lock.acquire();
			const status = this.#status.get(0);
			for (const systemId of [...additional, ...this.#systemsToExecute]) {
				if ((status & this.#intersections[systemId]) === 0n) {
					runningSystem = systemId;
					this.#systemsToExecute.delete(systemId);
					additional.delete(systemId);
					this.#status.orEquals(0, 1n << BigInt(systemId));
					break;
				}
			}
			this.#lock.release();

			if (runningSystem > -1) {
				yield runningSystem;

				await this.#lock.acquire();
				this.#status.xorEquals(0, 1n << BigInt(runningSystem));
				// TODO: Check if this wakes sleeping threads.
				Atomics.notify(this.#signal, 0);
				this.#lock.release();
			} else if (size !== 0) {
				await Atomics.waitAsync(this.#signal, 0, size).value;
			}
		}
	}

	[Thread.Send](): SerializedExecutor {
		return [
			this.#intersections,
			this.#status,
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
	status: BigUintArray,
	systemsToExecute: SparseSet,
	lock: Mutex,
];
