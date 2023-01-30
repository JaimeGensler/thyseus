type Pointer = number;
export type MemoryViews = {
	buffer: ArrayBuffer;
	u8: Uint8Array;
	u16: Uint16Array;
	u32: Uint32Array;
	u64: BigUint64Array;
	i8: Int8Array;
	i16: Int16Array;
	i32: Int32Array;
	i64: BigInt64Array;
	f32: Float32Array;
	f64: Float64Array;
	dataview: DataView;
};
const BLOCK_HEADER_SIZE = 8;
const BLOCK_FOOTER_POSITION = 4;
const BLOCK_METADATA_SIZE = 16;
const MINIMUM_BLOCK_SIZE = 24; // 16 + 8

const alignTo8 = (x: number) => Math.ceil(x / 8) * 8;

export class Memory {
	static withSize(size: number, isShared: boolean = false): Memory {
		size = alignTo8(size);
		const bufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
		const buffer = new bufferType(size);
		const u32 = new Uint32Array(buffer);
		u32[0] = size;
		u32[u32.length - 1] = size;
		return new this(u32);
	}

	static fromBuffer(buffer: ArrayBufferLike): Memory {
		return new this(new Uint32Array(buffer));
	}

	#buffer: ArrayBuffer | SharedArrayBuffer;
	#views: MemoryViews;
	#u8: Uint8Array;
	#u32: Uint32Array;

	constructor(u32: Uint32Array) {
		this.#buffer = u32.buffer;
		this.#u8 = new Uint8Array(this.#buffer);
		this.#u32 = u32;
		this.#views = {
			buffer: this.#buffer,
			u8: this.#u8,
			u16: new Uint16Array(this.#buffer),
			u32: this.#u32,
			u64: new BigUint64Array(this.#buffer),
			i8: new Int8Array(this.#buffer),
			i16: new Int16Array(this.#buffer),
			i32: new Int32Array(this.#buffer),
			i64: new BigInt64Array(this.#buffer),
			f32: new Float32Array(this.#buffer),
			f64: new Float64Array(this.#buffer),
			dataview: new DataView(this.#buffer),
		};
	}

	get views() {
		return this.#views;
	}

	alloc(size: number): Pointer {
		size = alignTo8(size);
		let pointer = 0;

		this.#spinlock();
		while (pointer < this.#buffer.byteLength) {
			const header = this.#u32[pointer >> 2];
			const blockSize = header & ~1;
			const isBlockAllocated = header !== blockSize;
			const requiredSize = BLOCK_METADATA_SIZE + size;

			if (isBlockAllocated || blockSize < requiredSize) {
				pointer += blockSize;
				continue;
			}

			const shouldSplit = blockSize - requiredSize >= MINIMUM_BLOCK_SIZE;
			const newBlockSize = shouldSplit ? requiredSize : blockSize;

			this.#u32[pointer >> 2] = newBlockSize | 1;
			this.#u32[(pointer + newBlockSize - BLOCK_FOOTER_POSITION) >> 2] =
				newBlockSize | 1;

			if (shouldSplit) {
				const splitPointer = pointer + requiredSize;
				const splitBlockSize = blockSize - requiredSize;
				this.#u32[splitPointer >> 2] = splitBlockSize;
				this.#u32[
					(splitPointer + splitBlockSize - BLOCK_FOOTER_POSITION) >> 2
				] = splitBlockSize;
			}

			this.#releaseLock();
			return pointer + BLOCK_HEADER_SIZE;
		}

		// TODO: Just return a null pointer?
		throw new Error(`Out of memory (needed ${size})!`);
	}

	free(pointer: Pointer): void {
		let header = pointer - BLOCK_HEADER_SIZE;
		this.#spinlock();
		let size = this.#u32[header >> 2] & ~1;
		let footer = header + size - BLOCK_FOOTER_POSITION;
		this.#u32[header >> 2] &= ~1;
		this.#u32[footer >> 2] &= ~1;

		if (footer !== this.#buffer.byteLength - BLOCK_FOOTER_POSITION) {
			const next = this.#u32[(header + size) >> 2];
			if ((next & 1) === 0) {
				footer += next;
				size += next;
			}
		}

		if (header !== 0) {
			const prev = this.#u32[(header - BLOCK_FOOTER_POSITION) >> 2];
			if ((prev & 1) === 0) {
				header -= prev;
				size += prev;
			}
		}
		this.#u32[header >> 2] = size;
		this.#u32[footer >> 2] = size;
		this.#u8.fill(
			0,
			header + BLOCK_HEADER_SIZE,
			footer - BLOCK_HEADER_SIZE,
		);
		this.#releaseLock();
	}

	realloc(pointer: Pointer, newSize: number): Pointer {
		newSize = alignTo8(newSize);
		this.#spinlock();
		const header = pointer - BLOCK_HEADER_SIZE;
		const size = this.#u32[header >> 2] & ~1;
		const payloadSize = size - BLOCK_METADATA_SIZE;
		if (payloadSize >= newSize) {
			this.#releaseLock();
			return pointer;
		}

		// TODO: Bounds check
		const next = header + size;
		const nextSize = this.#u32[next >> 2];

		if (
			(nextSize & 1) === 0 &&
			nextSize - BLOCK_METADATA_SIZE >= newSize - size
		) {
			const remainderSize = newSize - payloadSize;
			const shouldSplit = nextSize - remainderSize >= MINIMUM_BLOCK_SIZE;
			const newBlockSize = shouldSplit
				? newSize + BLOCK_METADATA_SIZE
				: size + nextSize;

			this.#u32[next >> 2] = 0;
			this.#u32[(next - BLOCK_FOOTER_POSITION) >> 2] = 0;

			this.#u32[header >> 2] = newBlockSize | 1;
			this.#u32[(header + newBlockSize - BLOCK_FOOTER_POSITION) >> 2] =
				newBlockSize | 1;

			if (shouldSplit) {
				const splitSize = size + nextSize - newBlockSize;
				this.#u32[(header + newBlockSize) >> 2] = splitSize;
				this.#u32[
					(header +
						newBlockSize +
						splitSize -
						BLOCK_FOOTER_POSITION) >>
						2
				] = splitSize;
			}
			this.#releaseLock();
			return pointer;
		}

		this.#releaseLock();
		const newPointer = this.alloc(newSize);
		this.copy(pointer, payloadSize, newPointer);
		this.free(pointer);
		return newPointer;
	}

	copy(from: Pointer, length: number, to: Pointer) {
		this.#u8.copyWithin(to, from, from + length);
	}

	set(from: Pointer, length: number, value: number) {
		this.#u8.fill(value, from, from + length);
	}

	#spinlock() {
		// TODO
	}
	#releaseLock() {
		// TODO
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe('alloc', () => {
		it('returns a pointer', () => {
			const memory = Memory.withSize(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			const ptr2 = memory.alloc(16);
			expect(ptr2).toBe(32);
		});

		it('yields a full block if splitting is too small', () => {});
	});

	describe('free', () => {
		it('clears a block and allows it to be allocated again', () => {
			const memory = Memory.withSize(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			memory.free(ptr1);
			const ptr2 = memory.alloc(8);
			expect(ptr2).toBe(8);
		});

		it('collects the next block if free', () => {
			const memory = Memory.withSize(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			memory.free(ptr1);
			const ptr2 = memory.alloc(16);
			expect(ptr2).toBe(8);
		});

		it('collects the previous block if free', () => {
			const memory = Memory.withSize(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);
			const ptr2 = memory.alloc(8);
			expect(ptr2).toBe(32);

			memory.free(ptr1);
			memory.free(ptr2);

			const ptr3 = memory.alloc(16);
			expect(ptr3).toBe(8);
		});
	});

	describe('realloc', () => {
		it('returns the same pointer if allocated block is large enough already', () => {
			const memory = Memory.withSize(256);
			const ptr = memory.alloc(3); // This is pushed to 8
			const newPtr = memory.realloc(ptr, 5);
			expect(newPtr).toBe(ptr);
			const newerPtr = memory.realloc(newPtr, 7);
			expect(newerPtr).toBe(ptr);
			const newestPtr = memory.realloc(newerPtr, 7);
			expect(newestPtr).toBe(ptr);
		});

		it('returns the same pointer if following block can be used', () => {
			const memory = Memory.withSize(256);
			const ptr = memory.alloc(8);
			const newPtr = memory.realloc(ptr, 16);
			expect(newPtr).toBe(ptr);
		});

		it('returns the same pointer and entire following block, if necessary', () => {
			const memory = Memory.withSize(256);
			const ptr1 = memory.alloc(8);
			const ptr2 = memory.alloc(8);
			const heldPtr = memory.alloc(8);
			memory.free(ptr2);
			const ptr1Grow = memory.realloc(ptr1, 12);
			expect(ptr1Grow).toBe(ptr1);
		});
	});
}
