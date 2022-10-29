const b255 = 0b1111_1111n;
export class BigUintArray {
	static getBufferLength(width: number, length: number) {
		return Math.ceil(width / 8) * length;
	}

	#bytesPerElement: number;

	width: number;
	length: number;
	#data: Uint8Array;
	constructor(width: number, length: number, data: Uint8Array) {
		this.width = width;
		this.length = length;
		this.#data = data;

		this.#bytesPerElement = Math.ceil(this.width / 8);
	}
	get bytesPerElement() {
		return this.#bytesPerElement;
	}
	get byteLength() {
		return this.#data.byteLength;
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
	OR(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] |= Number((value >> BigInt(i * 8)) & b255);
		}
	}
	XOR(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] ^= Number((value >> BigInt(i * 8)) & b255);
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	const getMaxValue = (width: number) => {
		let result = 1n;
		for (let i = 1; i < width; i++) {
			result |= result << 1n;
		}
		return result;
	};
	const getBigUintArray = (width: number, length: number) =>
		new BigUintArray(
			width,
			length,
			new Uint8Array(BigUintArray.getBufferLength(width, length)),
		);

	const length = 16;

	it.each([
		['less than one-byte', 5],
		['one-byte aligned', 8],
		['two-byte aligned', 16],
		['unaligned', 35],
		['greater than 8 bytes', 75],
	])('gets/sets elements when width is &s', (_, width) => {
		const arr = getBigUintArray(width, length);
		expect(arr.width).toBe(width);
		expect(arr.length).toBe(length);
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

	it('correctly ORs/XORs', () => {
		const arr = getBigUintArray(12, 2);
		expect(arr.get(0)).toBe(0n);
		arr.set(0, 0b1111_0000_1111n);
		arr.OR(0, 0b0000_1111_0000n);
		expect(arr.get(0)).toBe(0b1111_1111_1111n);

		expect(arr.get(1)).toBe(0n);
		arr.set(1, 0b1100_1010_0011n);
		arr.XOR(1, 0b1111_0111_0111n);
		expect(arr.get(1)).toBe(0b0011_1101_0100n);
	});
}
