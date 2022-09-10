import { ThreadProtocol } from '../Thread';

const b255 = 0b1111_1111n;
export default class BigUintArray {
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
	AND(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] &= Number((value >> BigInt(i * 8)) & b255);
		}
	}
	XOR(element: number, value: bigint) {
		const index = this.#bytesPerElement * element;
		for (let i = 0; i < this.#bytesPerElement; i++) {
			this.#data[index + i] ^= Number((value >> BigInt(i * 8)) & b255);
		}
	}

	[ThreadProtocol.Send](): SerializedBigUintNArray {
		return [this.width, this.length, this.#data];
	}
	static [ThreadProtocol.Receive]([
		width,
		length,
		data,
	]: SerializedBigUintNArray) {
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
	const { it, expect } = import.meta.vitest;

	const getMaxValue = (width: number) => {
		let result = 1n;
		for (let i = 1; i < width; i++) {
			result |= result << 1n;
		}
		return result;
	};

	const length = 16;

	it.each([
		['less than one-byte', 5],
		['one-byte aligned', 8],
		['two-byte aligned', 16],
		['unaligned', 35],
		['greater than 64 bits', 75],
	])('gets/sets elements when width is &s', (_, width) => {
		const arr = BigUintArray.with(width, length);
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

	it('correctly ORs/ANDs/XORs', () => {
		const arr = BigUintArray.with(12, 3);
		expect(arr.get(0)).toBe(0n);
		arr.set(0, 0b1111_0000_1111n);
		arr.OR(0, 0b0000_1111_0000n);
		expect(arr.get(0)).toBe(0b1111_1111_1111n);

		expect(arr.get(1)).toBe(0n);
		arr.set(1, 0b1110_0000_0111n);
		arr.AND(1, 0b1010_0101_1010n);
		expect(arr.get(1)).toBe(0b1010_0000_0010n);

		expect(arr.get(2)).toBe(0n);
		arr.set(2, 0b1100_1010_0011n);
		arr.XOR(2, 0b1111_0111_0111n);
		expect(arr.get(2)).toBe(0b0011_1101_0100n);
	});

	it('desconstructs to and reconstructs from shareable interface', () => {
		const arr = BigUintArray.with(13, 6);

		const slots = [0b1n, 0n, 0n, 0b1011_1010n, 0b1_0000_0000_0000n, 0n];
		slots.forEach((slot, i) => arr.set(i, slot));

		const rec = BigUintArray[ThreadProtocol.Receive](
			arr[ThreadProtocol.Send](),
		);
		expect(arr.byteLength).toBe(rec.byteLength);
		expect(arr.bytesPerElement).toBe(rec.bytesPerElement);
		expect(arr.width).toBe(rec.width);
		expect(arr.length).toBe(rec.length);

		slots.forEach((slot, i) => expect(rec.get(i)).toBe(slot));
		rec.set(1, 0b1001n);
		expect(arr.get(1)).toBe(0b1001n);
	});
}
