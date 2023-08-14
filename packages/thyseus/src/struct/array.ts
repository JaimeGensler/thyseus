import { Memory } from '../utils';
import { Numeric, numeric } from './primitives';

// For arrays of dynamic lengths - essentially Vec<T>
// size: 12 | alignment: 4
// Fields are ordered [length, capacity, pointer]

export function deserializeArray(
	pointer: number,
	array: (number | bigint)[],
	type: Numeric,
): void {
	const length = Memory.u32[pointer >> 2];
	const offset = Memory.u32[(pointer + 8) >> 2] >> numeric[type];
	for (let i = 0; i < length; i++) {
		array[i] = Memory[type][offset + i];
	}
	array.length = length;
}
export function serializeArray(
	pointer: number,
	array: (number | bigint)[],
	type: Numeric,
): void {
	const newLength = array.length;
	const currentCapacity = Memory.u32[(pointer + 4) >> 2];
	const shift = numeric[type];
	if (newLength > currentCapacity) {
		Memory.reallocAt(pointer + 8, newLength << shift);
		Memory.u32[(pointer + 4) >> 2] = newLength;
	}
	Memory.u32[pointer >> 2] = array.length;
	Memory[type].set(array as any, Memory.u32[(pointer + 8) >> 2] >> shift);
}
export function dropArray(pointer: number): void {
	Memory.free(Memory.u32[(pointer + 8) >> 2]);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;

	beforeEach(() => {
		Memory.init(4_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	it('serializes u8 arrays', () => {
		const ptr = Memory.alloc(12);
		const myArray = [1, 2, 3, 4];
		serializeArray(ptr, myArray, 'u8');
		myArray.length = 0;
		expect(myArray).toStrictEqual([]);
		deserializeArray(ptr, myArray, 'u8');
		expect(myArray).toStrictEqual([1, 2, 3, 4]);
	});

	it('serializes float arrays', () => {
		const ptr = Memory.alloc(12);
		const myArray = [Math.PI, Math.E, Math.SQRT2];

		serializeArray(ptr, myArray, 'f64');
		myArray.length = 0;
		expect(myArray).toStrictEqual([]);

		deserializeArray(ptr, myArray, 'f64');
		expect(myArray).toStrictEqual([Math.PI, Math.E, Math.SQRT2]);

		myArray.push(4, 8, 15, 16, 23, 42);

		serializeArray(ptr, myArray, 'f64');
		myArray.length = 0;
		expect(myArray).toStrictEqual([]);

		deserializeArray(ptr, myArray, 'f64');
		expect(myArray).toStrictEqual([
			Math.PI,
			Math.E,
			Math.SQRT2,
			4,
			8,
			15,
			16,
			23,
			42,
		]);
	});
}
