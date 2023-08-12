import { Memory } from '../utils';

/**
 * A `Vec<u32>`.
 */
export class Vec {
	static size = 12;
	static alignment = 4;

	/**
	 * The raw pointer to this Vecs `[length, capacity, pointer]`.
	 * All are u32 values - pointer already shifted for u32 access.
	 */
	#rawPointer: number;
	constructor(pointer: number) {
		this.#rawPointer = pointer >> 2;
	}

	/**
	 * The length, in elements, of this Vec.
	 */
	get length(): number {
		return Memory.u32[this.#rawPointer];
	}

	/**
	 * The capacity, in elements, of this Vec.
	 */
	get capacity(): number {
		return Memory.u32[this.#rawPointer + 1];
	}

	/**
	 * The pointer to this Vecs elements.
	 */
	get #pointer(): number {
		return Memory.u32[this.#rawPointer + 2] >> 2;
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
		return Memory.u32[this.#pointer + index];
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
		Memory.u32[this.#pointer + index] = value;
	}

	/**
	 * Pushes a new value into this Vec and returns the Vec's new length.
	 * @param value
	 * @returns
	 */
	push(value: number): number {
		if (this.length === this.capacity) {
			this.grow(this.length * 2 || 4);
		}
		Memory.u32[this.#pointer + this.length] = value;
		Memory.u32[this.#rawPointer]++;
		return this.length;
	}

	/**
	 * Removes the specified number of elements from the Vec.
	 */
	remove(count: number): void {
		Memory.u32[this.#rawPointer] -= Math.min(count, this.length);
	}

	/**
	 * Grows the Vec to the specified capacity.
	 * Length will not be changed.
	 * @param newCapacity The new capacity - **in elements** - of this Vec.
	 * @returns `this`
	 */
	grow(newCapacity: number): this {
		if (this.capacity >= newCapacity) {
			return this;
		}
		Memory.reallocAt((this.#rawPointer + 2) << 2, newCapacity * 4);
		Memory.u32[this.#rawPointer + 1] = newCapacity;
		return this;
	}

	/**
	 * Fills the remaining capacity with the provided value.
	 * @param value The value to fill all uninitialized spots with.
	 */
	fill(value: number): void {
		Memory.u32.fill(
			value,
			this.#pointer + this.length,
			this.#pointer + this.capacity,
		);
		Memory.u32[this.#rawPointer] = Memory.u32[this.#rawPointer + 1];
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
	const newVec = () => new Vec(Memory.alloc(Vec.size));

	it('creates a Vec with length/capacity 0', () => {
		const vec = newVec();
		expect(vec).toHaveProperty('length', 0);
		expect(vec).toHaveProperty('capacity', 0);
	});

	it('pushes elements', () => {
		const vec = newVec();
		expect(vec.length).toBe(0);

		for (let i = 1; i < 10; i++) {
			const newLength = vec.push(5);
			expect(newLength).toBe(i);
			expect(vec.length).toBe(i);
			expect(vec.capacity).toBeGreaterThanOrEqual(vec.length);
		}
	});

	it('gets/sets elements', () => {
		const vec = newVec();

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

	it('grow() grows to fit elements', () => {
		const vec = newVec();

		expect(vec.capacity).toBe(0);
		vec.grow(10);
		expect(vec.capacity).toBe(10);
		vec.grow(100);
		expect(vec.capacity).toBe(100);
		vec.grow(1000);
		expect(vec.capacity).toBe(1000);
	});

	it('remove() removes the specified number of elements', () => {
		const vec = newVec();

		expect(vec.capacity).toBe(0);
		vec.grow(10);
		expect(vec.capacity).toBe(10);
		expect(vec.length).toBe(0);
		vec.push(1);
		vec.push(2);
		vec.push(3);
		vec.push(4);
		expect(vec.length).toBe(4);
		vec.remove(2);
		expect(vec.length).toBe(2);
		vec.remove(1);
		expect(vec.length).toBe(1);
		vec.remove(3);
		expect(vec.length).toBe(0);
	});
	it('fill() fills the remaining capacity with the provided value', () => {
		const vec = newVec();

		expect(vec.capacity).toBe(0);
		vec.grow(8);
		expect(vec.capacity).toBe(8);
		expect(vec.length).toBe(0);
		expect(vec.fill(3));
		expect(vec.length).toBe(8);
		for (let i = 0; i < 8; i++) {
			expect(vec.get(i)).toBe(3);
		}

		// Alloc here just to make sure we didn't overwrite the block header
		Memory.alloc(16);
	});
}
