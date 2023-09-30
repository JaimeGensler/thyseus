import { alignTo8 } from '../utils';
import type { u8, u16, u32, u64, i8, i16, i32, i64, f32, f64 } from '../struct';

/**
 * A store of binary data (backed by an `ArrayBuffer` or `SharedArrayBuffer`), as well as miscellaneous object data.
 *
 * Used to read/write contiguous binary data of differing types out of the buffer.
 */
export class Store {
	/**
	 * A mutable offset used by `readU8()`/`writeU8()`/etc. when accessing buffer data.
	 * Moves whenever a read/write method is called.
	 */
	offset: number;

	/**
	 * The number of elements or bytes currently used by the store.
	 * Must be managed externally.
	 */
	length: number;

	/**
	 * The raw underlying `ArrayBuffer` or `SharedArrayBuffer` for this store's data.
	 */
	buffer: ArrayBufferLike;
	/**
	 * A `Uint8Array` view over the buffer's contents
	 */
	u8: Uint8Array;
	/**
	 * A `Uint16Array` view over the buffer's contents
	 */
	u16: Uint16Array;
	/**
	 * A `Uint32Array` view over the buffer's contents
	 */
	u32: Uint32Array;
	/**
	 * A `BigUint64Array` view over the buffer's contents
	 */
	u64: BigUint64Array;
	/**
	 * An `Int8Array` view over the buffer's contents
	 */
	i8: Int8Array;
	/**
	 * An `Int16Array` view over the buffer's contents
	 */
	i16: Int16Array;
	/**
	 * An `Int32Array` view over the buffer's contents
	 */
	i32: Int32Array;
	/**
	 * A `BigInt64Array` view over the buffer's contents
	 */
	i64: BigInt64Array;
	/**
	 * A `Float32Array` view over the buffer's contents
	 */
	f32: Float32Array;
	/**
	 * A `Float64Array` view over the buffer's contents
	 */
	f64: Float64Array;

	misc: any[];

	constructor(byteLength: number) {
		this.offset = 0;
		this.length = 0;

		this.buffer = new ArrayBuffer(alignTo8(byteLength));
		this.u8 = new Uint8Array(this.buffer);
		this.u16 = new Uint16Array(this.buffer);
		this.u32 = new Uint32Array(this.buffer);
		this.u64 = new BigUint64Array(this.buffer);
		this.i8 = new Int8Array(this.buffer);
		this.i16 = new Int16Array(this.buffer);
		this.i32 = new Int32Array(this.buffer);
		this.i64 = new BigInt64Array(this.buffer);
		this.f32 = new Float32Array(this.buffer);
		this.f64 = new Float64Array(this.buffer);

		this.misc = [];
	}
	/**
	 * The total byte length of the store's underlying ArrayBuffer.
	 */
	get byteLength(): number {
		return this.u8.byteLength;
	}

	/**
	 * Starting at `from`, copies `length` bytes to the target destination `to`.
	 * @param from The offset to start copying from.
	 * @param length The number of bytes to copy.
	 * @param to The offset to copy data to.
	 */
	copyWithin(from: number, length: number, to: number): void {
		this.u8.copyWithin(to, from, from + length);
	}
	/**
	 * Copies `length` bytes from `other` store at `otherOffset` to `thisOffset`.
	 * @param other The store to copy from.
	 * @param length The number of bytes to copy.
	 * @param otherOffset The offset in the other store to copy from.
	 * @param thisOffset The offset in this store to copy to.
	 */
	copyFrom(
		other: Store,
		length: number,
		otherOffset: number,
		thisOffset: number,
	): void {
		this.u8.set(
			other.u8.subarray(otherOffset, otherOffset + length),
			thisOffset,
		);
	}
	/**
	 * Starting at `from`, sets `length` bytes to `value`.
	 * @param from The offset to start writing to.
	 * @param length The number of bytes to write.
	 * @param value The value (as a `u8`) to set the specified bytes to.
	 */
	set(from: number, length: number, value: number): void {
		this.u8.fill(value, from, from + length);
	}
	/**
	 * Resizes this store's internal buffer, copying any data from the old buffer.
	 * Resets `offset` to 0.
	 * @param newByteLength The new length in bytes for this buffer.
	 */
	resize(newByteLength: number): void {
		this.offset = 0;
		const bufferType = this.buffer.constructor as ArrayBufferConstructor;
		const oldU8 = this.u8;

		this.buffer = new bufferType(alignTo8(newByteLength));
		this.u8 = new Uint8Array(this.buffer);
		this.u16 = new Uint16Array(this.buffer);
		this.u32 = new Uint32Array(this.buffer);
		this.u64 = new BigUint64Array(this.buffer);
		this.i8 = new Int8Array(this.buffer);
		this.i16 = new Int16Array(this.buffer);
		this.i32 = new Int32Array(this.buffer);
		this.i64 = new BigInt64Array(this.buffer);
		this.f32 = new Float32Array(this.buffer);
		this.f64 = new Float64Array(this.buffer);
		this.u8.set(oldU8);
	}

	/**
	 * Reads the unsigned 8-bit integer value at the current offset, moving the offset by 1 byte.
	 * @returns The `u8` value at the offset.
	 */
	readU8(): u8 {
		return this.u8[(this.offset += 1) - 1];
	}
	/**
	 * Writes an unsigned 8-bit integer value to the current offset, moving the offset by 1 byte.
	 */
	writeU8(value: u8): void {
		this.u8[(this.offset += 1) - 1] = value;
	}

	/**
	 * Reads the unsigned 16-bit integer value at the current offset, moving the offset by 2 bytes.
	 * @returns The `u16` value at the offset.
	 */
	readU16(): u16 {
		return this.u16[((this.offset += 2) - 2) >> 1];
	}
	/**
	 * Writes an unsigned 16-bit integer value to the current offset, moving the offset by 2 bytes.
	 */
	writeU16(value: u16): void {
		this.u16[((this.offset += 2) - 2) >> 1] = value;
	}

	/**
	 * Reads the unsigned 32-bit integer value at the current offset, moving the offset by 4 bytes.
	 * @returns The `u32` value at the offset.
	 */
	readU32(): u32 {
		return this.u32[((this.offset += 4) - 4) >> 2];
	}
	/**
	 * Writes an unsigned 32-bit integer value to the current offset, moving the offset by 4 bytes.
	 */
	writeU32(value: u32): void {
		this.u32[((this.offset += 4) - 4) >> 2] = value;
	}

	/**
	 * Reads the unsigned 64-bit integer value at the current offset, moving the offset by 8 bytes.
	 * @returns The `u64` value at the offset.
	 */
	readU64(): u64 {
		return this.u64[((this.offset += 8) - 8) >> 3];
	}
	/**
	 * Writes an unsigned 64-bit integer value to the current offset, moving the offset by 8 bytes.
	 */
	writeU64(value: u64): void {
		this.u64[((this.offset += 8) - 8) >> 3] = value;
	}

	/**
	 * Reads the signed 8-bit integer value at the current offset, moving the offset by 1 byte.
	 * @returns The `i8` value at the offset.
	 */
	readI8(): i8 {
		return this.i8[(this.offset += 1) - 1];
	}
	/**
	 * Writes a signed 8-bit integer value to the current offset, moving the offset by 1 byte.
	 */
	writeI8(value: i8): void {
		this.i8[(this.offset += 1) - 1] = value;
	}

	/**
	 * Reads the signed 16-bit integer value at the current offset, moving the offset by 2 bytes.
	 * @returns The `i16` value at the offset.
	 */
	readI16(): i16 {
		return this.i16[((this.offset += 2) - 2) >> 1];
	}
	/**
	 * Writes a signed 16-bit integer value to the current offset, moving the offset by 2 bytes.
	 */
	writeI16(value: i16): void {
		this.i16[((this.offset += 2) - 2) >> 1] = value;
	}

	/**
	 * Reads the signed 32-bit integer value at the current offset, moving the offset by 4 bytes.
	 * @returns The `i32` value at the offset.
	 */
	readI32(): i32 {
		return this.i32[((this.offset += 4) - 4) >> 2];
	}
	/**
	 * Writes a signed 32-bit integer value to the current offset, moving the offset by 4 bytes.
	 */
	writeI32(value: i32): void {
		this.i32[((this.offset += 4) - 4) >> 2] = value;
	}

	/**
	 * Reads the signed 64-bit integer value at the current offset, moving the offset by 8 bytes.
	 * @returns The `i64` value at the offset.
	 */
	readI64(): i64 {
		return this.i64[((this.offset += 8) - 8) >> 3];
	}
	/**
	 * Writes a signed 64-bit integer value to the current offset, moving the offset by 8 bytes.
	 */
	writeI64(value: i64): void {
		this.i64[((this.offset += 8) - 8) >> 3] = value;
	}

	/**
	 * Reads the 32-bit single-precision floating-point value (float) at the current offset, moving the offset by 4 bytes.
	 * @returns The `f32` value at the offset.
	 */
	readF32(): f32 {
		return this.f32[((this.offset += 4) - 4) >> 2];
	}
	/**
	 * Writes a 32-bit single-precision floating-point value (float) to the current offset, moving the offset by 4 bytes.
	 */
	writeF32(value: f32): void {
		this.f32[((this.offset += 4) - 4) >> 2] = value;
	}

	/**
	 * Reads the 64-bit double-precision floating-point value (double) at the current offset, moving the offset by 8 bytes.
	 * @returns The `f64` value at the offset.
	 */
	readF64(): f64 {
		return this.f64[((this.offset += 8) - 8) >> 3];
	}
	/**
	 * Writes a 64-bit double-precision floating-point value (double) to the current offset, moving the offset by 8 bytes.
	 */
	writeF64(value: f64): void {
		this.f64[((this.offset += 8) - 8) >> 3] = value;
	}
	readMisc<T = any>(): T {
		// TODO
		return {} as T;
	}
	writeMisc(value: any): void {
		// TODO
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	it('works', () => {});
}
