import assert from '../utils/assert';
import Thread from '../utils/Thread';

enum LockState {
	Unlocked,
	Locked,
}
// Locks adapted from https://v8.dev/features/atomics
// TODO: Should this be removed in favor of the native LockManager API?
export default class Mutex {
	#state: Int32Array; // [LockState]

	constructor(state: Int32Array = new Int32Array(new SharedArrayBuffer(4))) {
		this.#state = state;
	}

	async acquire() {
		while (true) {
			const oldLockState = Atomics.compareExchange(
				this.#state,
				0,
				LockState.Unlocked,
				LockState.Locked,
			);
			if (oldLockState === LockState.Unlocked) {
				return;
			}
			await Atomics.waitAsync(this.#state, 0, LockState.Unlocked).value;
		}
	}
	release() {
		const oldValue = Atomics.compareExchange(
			this.#state,
			0,
			LockState.Locked,
			LockState.Unlocked,
		);
		Atomics.notify(this.#state, 0);
		assert(
			oldValue !== LockState.Locked,
			'Tried to unlock a mutex that was not locked.',
		);
	}

	[Thread.Send]() {
		return this.#state;
	}
	static [Thread.Receive](state: Int32Array) {
		return new this(state);
	}
}
