import Thread from '../utils/Thread';

const b255 = 0b1111_1111n;
export default class BigUintArray {
	width: number;
	length: number;
	#data: Uint8Array;
	#bytesPerElement: number;

	get bytesPerElement() {
		return this.#bytesPerElement;
	}
	get byteLength() {
		return this.#data.byteLength;
	}

	static with(
		width: number,
		length: number,
		isShared: boolean = false,
	): BigUintArray {
		const BufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
		return new this(
			width,
			length,
			new Uint8Array(new BufferType(Math.ceil(width / 8) * length)),
		);
	}

	constructor(width: number, length: number, data: Uint8Array) {
		this.width = width;
		this.length = length;
		this.#data = data;

		this.#bytesPerElement = Math.ceil(this.width / 8);
	}

	get(element: number): bigint {
		let result = 0n;
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			result |= BigInt(this.#data[index + i]) << BigInt(i * 8);
		}
		return result;
	}
	set(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] = Number((value >> BigInt(i * 8)) & b255);
		}
	}
	orEquals(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] |= Number((value >> BigInt(i * 8)) & b255);
		}
	}
	andEquals(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] &= Number((value >> BigInt(i * 8)) & b255);
		}
	}
	xorEquals(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] ^= Number((value >> BigInt(i * 8)) & b255);
		}
	}

	[Thread.Send](): SerializedBigUintNArray {
		return [this.width, this.length, this.#data];
	}
	static [Thread.Receive]([width, length, data]: SerializedBigUintNArray) {
		return new this(width, length, data);
	}
}
type SerializedBigUintNArray = [
	width: number,
	length: number,
	data: Uint8Array,
];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	const getMaxValue = (width: number) => {
		let result = 1n;
		for (let i = 1; i < width; i++) {
			result |= result << 1n;
		}
		return result;
	};

	describe('BigUintArray', () => {
		const length = 16;

		it.each([
			['less than one-byte', 5],
			['one-byte aligned', 8],
			['two-byte aligned', 16],
			['unaligned', 35],
			['greater than 64 bits', 75],
		])('gets/sets elements when width is &s', (_, width) => {
			const arr = BigUintArray.with(width, length);
			expect(arr.bytesPerElement).toBe(Math.ceil(width / 8));
			expect(arr.byteLength).toBe(arr.bytesPerElement * arr.length);
			for (let i = 0; i < length; i++) {
				expect(arr.get(i)).toBe(0n);
				arr.set(i, 5n);
				expect(arr.get(i)).toBe(5n);
				arr.set(i, 0n);
				expect(arr.get(0)).toBe(0n);
			}

			const max = getMaxValue(width);
			arr.set(4, BigInt(width * 5));
			arr.set(5, max);
			arr.set(6, BigInt(width * 5));

			expect(arr.get(4)).toBe(BigInt(width * 5));
			expect(arr.get(5)).toBe(max);
			expect(arr.get(6)).toBe(BigInt(width * 5));
		});

		it.todo('correctly ors/ands/xors');
		it.todo('desconstructs to and reconstructs from shareable interface');
	});
}
