let nextId = 0;

export class Mutex<T extends any> {
	static getId() {
		return String(nextId++);
	}
	id: string;
	#data: T;
	constructor(data: T, id: string = Mutex.getId()) {
		this.#data = data;
		this.id = id;
	}

	UNSAFE_getData(): T {
		return this.#data;
	}
	request(fn: (data: T) => void): Promise<undefined> {
		return navigator.locks.request(this.id, () => fn(this.#data));
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	it.skip('acquires lock if no other mutexes hold the same lock', async () => {
		const lockedValue = Symbol();
		const mut = new Mutex(lockedValue, '1');

		const spy = vi.fn();
		mut.request(spy);
		expect(spy).not.toHaveBeenCalled();
		await Promise.resolve();
		await Promise.resolve();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(lockedValue);
	});

	it.skip('waits before unlocked to acquire lock', async () => {
		const lockedValue = Symbol();
		const mut1 = new Mutex(lockedValue, '1');
		const mut2 = new Mutex(lockedValue, '1');

		let resolve: Function = () => {};
		const spy1 = vi.fn(() => new Promise(r => (resolve = r)));
		const spy2 = vi.fn(() => new Promise(r => (resolve = r)));

		const p1 = mut1.request(spy1);
		const p2 = mut2.request(spy2);
		await Promise.resolve();

		expect(spy1).toHaveBeenCalled();
		expect(spy2).not.toHaveBeenCalled();
		const resolveValue = Symbol();
		resolve(resolveValue);
		expect(await p1).toBe(resolveValue);
		await new Promise(r => setTimeout(r, 0));

		expect(spy2).toHaveBeenCalled();
		resolve(resolveValue);
		expect(await p2).toBe(resolveValue);
	});

	it.skip('allows extracting data unsafely', async () => {
		const lockedValue = Symbol();
		const mut1 = new Mutex(lockedValue, '1');
		expect(mut1.UNSAFE_getData()).toBe(lockedValue);

		let resolve: Function = () => {};
		mut1.request(() => new Promise(r => (resolve = r)));
		await Promise.resolve();
		expect(mut1.UNSAFE_getData()).toBe(lockedValue);
		resolve();
	});
}
