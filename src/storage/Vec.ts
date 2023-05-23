import { Memory } from '../utils';

/**
 * A `Vec<u32>`.
 *
 * Create with `Vec.new()` or `Vec.fromPointer`.
 */
export class Vec {
	static size = 12;
	static alignment = 4;

	static fromPointer(pointer: number) {
		return new this(pointer >> 2);
	}
	static new() {
		return new this(Memory.alloc(this.size) >> 2);
	}

	/**
	 * The raw pointer to this Vecs `[length, capacity, pointer]`.
	 * All are u32 values - pointer already shifted for u32 access.
	 */
	#rawPointer: number;
	constructor(pointer: number) {
		this.#rawPointer = pointer;
	}

	/**
	 * The length, in elements, of this Vec.
	 * If set, will grow if needed and initialize new elements to 0.
	 */
	get length(): number {
		return Memory.views.u32[this.#rawPointer];
	}
	set length(newLength: number) {
		if (newLength > this.capacity) {
			this.grow(newLength);
		} else if (newLength < this.length) {
			Memory.set(
				(this.#rawPointer + newLength) << 2,
				this.length - newLength,
				0,
			);
		}
		Memory.views.u32[this.#rawPointer] = newLength;
	}

	/**
	 * The capacity, in elements, of this Vec.
	 * Can be set to resize.
	 */
	get capacity(): number {
		return Memory.views.u32[this.#rawPointer + 1];
	}
	set capacity(newCapacity: number) {
		if (newCapacity > this.capacity) {
			this.grow(newCapacity);
		}
		Memory.views.u32[this.#rawPointer + 1] = newCapacity;
	}

	/**
	 * The pointer to this Vecs elements.
	 */
	get #pointer(): number {
		return Memory.views.u32[this.#rawPointer + 2] >> 2;
	}

	/**
	 * Returns the element at the provided index in the Vec.
	 * Throws if `index` is out of bounds.
	 * @param index The index of this Vec to get.
	 * @returns The value at that index.
	 */
	get(index: number): number {
		if (index > this.length) {
			throw new RangeError(
				'Out of bounds index access in Vec.prototype.get()!',
			);
		}
		return Memory.views.u32[this.#pointer + index];
	}

	/**
	 * Sets the element at the provided index in the Vec.
	 * Throws if `index` is out of bounds.
	 * @param index The index of this Vec to set.
	 * @param value The value to set the provided `index` to.
	 */
	set(index: number, value: number): void {
		if (index > this.length) {
			throw new RangeError(
				'Out of bounds index access in Vec.prototype.get()!',
			);
		}
		Memory.views.u32[this.#pointer + index] = value;
	}

	/**
	 * Pushes a new value into this Vec and returns the Vec's new length.
	 * @param value
	 * @returns
	 */
	push(value: number): number {
		if (this.length === this.capacity) {
			this.grow(this.length * 2 || 8);
		}
		Memory.views.u32[this.#pointer + this.length] = value;
		Memory.views.u32[this.#rawPointer]++;
		return this.length;
	}

	/**
	 * Removes the last element of this Vec and returns it.
	 */
	pop(): number {
		Memory.views.u32[this.#rawPointer]--;
		const value = Memory.views.u32[this.#pointer + this.length];
		Memory.views.u32[this.#pointer + this.length] = 0;
		return value;
	}

	/**
	 * Grows the Vec to the specified capacity.
	 * Length will not be changed.
	 * @param newCapacity The new capacity - **in elements** - of this Vec.
	 */
	grow(newCapacity: number): void {
		if (this.capacity >= newCapacity) {
			return;
		}
		Memory.reallocAt((this.#rawPointer + 2) << 2, newCapacity * 4);
		Memory.views.u32[this.#rawPointer + 1] = newCapacity;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach, vi } = import.meta.vitest;

	beforeEach(() => {
		Memory.init(10_000);
		return () => {
			Memory.UNSAFE_CLEAR_ALL();
			vi.clearAllMocks();
		};
	});

	it('creates a Vec with length/capacity 0', () => {
		const vec = Vec.new();
		expect(vec).toHaveProperty('length', 0);
		expect(vec).toHaveProperty('capacity', 0);
	});

	it('pushes elements', () => {
		const vec = Vec.new();
		expect(vec.length).toBe(0);

		for (let i = 1; i < 10; i++) {
			const newLength = vec.push(5);
			expect(newLength).toBe(i);
			expect(vec.length).toBe(i);
			expect(vec.capacity).toBeGreaterThanOrEqual(vec.length);
		}
	});

	it('gets/sets elements', () => {
		const vec = Vec.new();

		for (let i = 0; i < 10; i++) {
			vec.push(i);
		}
		expect(vec.length).toBe(10);

		for (let i = 0; i < 10; i++) {
			expect(vec.get(i)).toBe(i);
		}
		for (let i = 0; i < 10; i++) {
			vec.set(i, (i + 1) * 2);
		}
		for (let i = 0; i < 10; i++) {
			expect(vec.get(i)).toBe((i + 1) * 2);
		}
	});

	it('pops elements', () => {
		const vec = Vec.new();

		for (let i = 0; i < 10; i++) {
			vec.push(i);
		}

		expect(vec.length).toBe(10);

		for (let i = 0; i < 10; i++) {
			expect(vec.pop()).toBe(9 - i);
			expect(vec.length).toBe(9 - i);
		}
	});

	it('grow() grows to fit elements', () => {
		const vec = Vec.new();

		expect(vec.capacity).toBe(0);
		vec.grow(10);
		expect(vec.capacity).toBe(10);
		vec.grow(100);
		expect(vec.capacity).toBe(100);
		vec.grow(1000);
		expect(vec.capacity).toBe(1000);
	});

	it('setting length/capacity works', () => {
		const vec = Vec.new();
		expect(vec.length).toBe(0);
		vec.length = 10;
		expect(vec.length).toBe(10);
		expect(vec.capacity).toBe(10);
		vec.capacity = 30;
		expect(vec.length).toBe(10);
		expect(vec.capacity).toBe(30);
	});
}
