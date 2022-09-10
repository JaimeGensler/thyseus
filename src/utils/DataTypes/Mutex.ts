import assert from '../assert';
import { ThreadProtocol } from '../Thread';

enum LockState {
	Unlocked,
	Locked,
}
// Locks adapted from https://v8.dev/features/atomics
// TODO: Should this be removed in favor of the native LockManager API?
export default class Mutex<T extends any> {
	#data: T;
	#state: Int32Array; // [LockState]
	constructor(
		data: T,
		state: Int32Array = new Int32Array(new SharedArrayBuffer(4)),
	) {
		this.#data = data;
		this.#state = state;
	}

	get isLocked() {
		return this.#state[0] === LockState.Locked;
	}
	UNSAFE_getData(): T {
		return this.#data;
	}

	async request<R extends (data: T) => any>(fn: R): Promise<ReturnType<R>> {
		await this.#acquire();
		const result = await fn(this.#data);
		this.#release();
		return result;
	}

	async #acquire() {
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
	#release() {
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

	[ThreadProtocol.Send](): [T, Int32Array] {
		return [this.#data, this.#state];
	}
	static [ThreadProtocol.Receive]<T>([data, state]: [T, Int32Array]) {
		return new this<T>(data, state);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	it('acquires lock if no other mutexes hold the same lock', async () => {
		const mutexState = new Int32Array(1);
		const lockedValue = Symbol();
		const mut = new Mutex(lockedValue, mutexState);

		expect(mut.isLocked).toBe(false);
		const spy = vi.fn();
		mut.request(spy);
		expect(spy).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(mut.isLocked).toBe(true);
		await Promise.resolve();
		expect(mut.isLocked).toBe(false);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(lockedValue);
	});

	it('waits before unlocked to acquire lock', async () => {
		const mutexState = new Int32Array(new SharedArrayBuffer(4));
		const lockedValue = Symbol();
		const mut1 = new Mutex(lockedValue, mutexState);
		const mut2 = new Mutex(lockedValue, mutexState);

		expect(mut1.isLocked).toBe(false);
		expect(mut2.isLocked).toBe(false);

		let resolve: Function = () => {};
		const spy1 = vi.fn(() => new Promise(r => (resolve = r)));
		const spy2 = vi.fn(() => new Promise(r => (resolve = r)));

		const p1 = mut1.request(spy1);
		const p2 = mut2.request(spy2);
		await Promise.resolve();
		expect(mut1.isLocked).toBe(true);
		expect(mut2.isLocked).toBe(true);

		expect(spy1).toHaveBeenCalled();
		expect(spy2).not.toHaveBeenCalled();
		const resolveValue = Symbol();
		resolve(resolveValue);
		expect(await p1).toBe(resolveValue);
		await new Promise(r => setTimeout(r, 0));

		expect(mut1.isLocked).toBe(true);
		expect(mut2.isLocked).toBe(true);
		expect(spy2).toHaveBeenCalled();
		resolve(resolveValue);
		expect(await p2).toBe(resolveValue);
		expect(mut2.isLocked).toBe(false);
	});

	it('allows extracting data unsafely', async () => {
		const lockedValue = Symbol();
		const mut1 = new Mutex(lockedValue);
		expect(mut1.UNSAFE_getData()).toBe(lockedValue);

		let resolve: Function = () => {};
		mut1.request(() => new Promise(r => (resolve = r)));
		await Promise.resolve();
		expect(mut1.isLocked).toBe(true);
		expect(mut1.UNSAFE_getData()).toBe(lockedValue);
		resolve();
	});

	it('is Thread sendable', async () => {
		const mut1 = new Mutex(Symbol());
		const mut2 = Mutex[ThreadProtocol.Receive](mut1[ThreadProtocol.Send]());
		expect(mut1.UNSAFE_getData()).toBe(mut2.UNSAFE_getData());
		expect(mut1.isLocked).toBe(false);
		expect(mut2.isLocked).toBe(false);

		mut1.request(() => {});
		await Promise.resolve();
		expect(mut1.isLocked).toBe(true);
		expect(mut2.isLocked).toBe(true);
	});
}
