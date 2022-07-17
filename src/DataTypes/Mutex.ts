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

	get isLocked() {
		return this.#state[0] === LockState.Locked;
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
			await Atomics.waitAsync(this.#state, 0, LockState.Locked).value;
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
			oldValue === LockState.Locked,
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

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	it('acquires lock if no other mutexes hold the same lock', async () => {
		const mutexState = new Int32Array(1);
		const mut = new Mutex(mutexState);

		expect(mut.isLocked).toBe(false);
		mut.acquire();
		await Promise.resolve();
		expect(mut.isLocked).toBe(true);
	});

	it('waits before unlocked to acquire lock', async () => {
		const mutexState = new Int32Array(new SharedArrayBuffer(4));
		const mut1 = new Mutex(mutexState);
		const mut2 = new Mutex(mutexState);

		expect(mut1.isLocked).toBe(false);
		expect(mut2.isLocked).toBe(false);
		const spy1 = vi.fn();
		const spy2 = vi.fn();

		mut1.acquire().then(spy1);
		mut2.acquire().then(spy2);
		await Promise.resolve();
		expect(true).toBe(true);

		expect(spy1).toHaveBeenCalled();
		expect(spy2).not.toHaveBeenCalled();
		expect(mut1.isLocked).toBe(true);
		expect(mut2.isLocked).toBe(true);
		mut1.release();
		expect(mut1.isLocked).toBe(false);
		expect(mut2.isLocked).toBe(false);
		await new Promise(r => setTimeout(r, 0));
		expect(mut1.isLocked).toBe(true);
		expect(mut2.isLocked).toBe(true);
		expect(spy2).toHaveBeenCalled();
	});

	it('throws when trying to release an unlocked mutex', () => {
		expect(() => new Mutex().release()).toThrow(/Tried to unlock/);
	});
}
