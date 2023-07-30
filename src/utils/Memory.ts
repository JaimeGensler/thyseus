import { DEV_ASSERT } from './assert';
import { alignTo8 } from './alignTo8';

type Pointer = number;

let buffer: ArrayBuffer;
let u8: Uint8Array;
let u32: Uint32Array;

let BUFFER_END: number = 0;
const FIRST_POINTER: Pointer = 4;
const BLOCK_HEADER_SIZE = 4;
const BLOCK_FOOTER_SIZE = 4;
const BLOCK_METADATA_SIZE = 8;
const MINIMUM_BLOCK_SIZE = 16; // Metadata + 8 bytes

function spinlock(): void {
	while (Atomics.compareExchange(u32, 0, 0, 1) === 1);
}
function releaseLock(): void {
	Atomics.store(u32, 0, 0);
}

/**
 * Initializes memory if it has not been initialized yet.
 * @param size The size (in bytes) to initialize.
 * @param isShared Whether this memory should use a `SharedArrayBuffer` (defaults to false).
 */
function init(size: number, isShared?: boolean): ArrayBufferLike;
/**
 * Initializes memory if it has not been initialized yet.
 * @param size The ArrayBuffer to initialize memory with.
 */
function init(buffer: ArrayBufferLike): ArrayBufferLike;
function init(
	sizeOrBuffer: number | ArrayBufferLike,
	isShared: boolean = false,
): ArrayBufferLike {
	if (buffer) {
		return buffer;
	}
	if (typeof sizeOrBuffer === 'number') {
		const bufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
		buffer = new bufferType(alignTo8(sizeOrBuffer));
	} else {
		buffer = sizeOrBuffer;
	}

	u8 = new Uint8Array(buffer);
	u32 = new Uint32Array(buffer);
	Memory.buffer = buffer;
	Memory.u8 = u8;
	Memory.u16 = new Uint16Array(buffer);
	Memory.u32 = u32;
	Memory.u64 = new BigUint64Array(buffer);
	Memory.i8 = new Int8Array(buffer);
	Memory.i16 = new Int16Array(buffer);
	Memory.i32 = new Int32Array(buffer);
	Memory.i64 = new BigInt64Array(buffer);
	Memory.f32 = new Float32Array(buffer);
	Memory.f64 = new Float64Array(buffer);
	Memory.dataview = new DataView(buffer);
	BUFFER_END = buffer.byteLength - 4;
	if (typeof sizeOrBuffer === 'number') {
		u32[1] = buffer.byteLength - 8;
		u32[u32.length - 2] = buffer.byteLength - 8;
		u32[u32.length - 1] = 1;
	}
	return buffer;
}

/**
 * Allocates the specified number of bytes and returns a pointer.
 * Pointers are always 8 byte aligned.
 *
 * Throws if there is not enough memory to allocate the specified size.
 *
 * @param size The size (in bytes) to allocate.
 * @returns A pointer.
 */
function alloc(size: number): Pointer {
	const alignedSize = alignTo8(size);
	const requiredSize = BLOCK_METADATA_SIZE + alignedSize;
	let pointer = FIRST_POINTER;

	spinlock();
	while (pointer < BUFFER_END) {
		const header = u32[pointer >> 2];
		const blockSize = header & ~1;
		const isBlockAllocated = header !== blockSize;

		if (isBlockAllocated || blockSize < requiredSize) {
			DEV_ASSERT(
				blockSize !== 0,
				'Block size was 0 - this is a symptom of memory corruption, please report a bug.',
			);
			pointer += blockSize;
			continue;
		}

		const shouldSplit = blockSize - requiredSize >= MINIMUM_BLOCK_SIZE;
		const newBlockSize = shouldSplit ? requiredSize : blockSize;

		u32[pointer >> 2] = newBlockSize | 1;
		u32[(pointer + newBlockSize - BLOCK_FOOTER_SIZE) >> 2] =
			newBlockSize | 1;

		if (shouldSplit) {
			const splitPointer = pointer + requiredSize;
			const splitBlockSize = blockSize - requiredSize;
			u32[splitPointer >> 2] = splitBlockSize;
			u32[(splitPointer + splitBlockSize - BLOCK_FOOTER_SIZE) >> 2] =
				splitBlockSize;
		}

		releaseLock();
		return pointer + BLOCK_HEADER_SIZE;
	}

	releaseLock();
	throw new Error(`Out of memory (requesting ${size} bytes).`);
}

/**
 * Frees a pointer, allowing the memory at that location to be used again.
 * If a 0-pointer is provided, this function is a no-op.
 * @param pointer The pointer to free.
 */
function free(pointer: Pointer): void {
	DEV_ASSERT(
		pointer % 8 === 0,
		'Invalid pointer in free - pointer was not correctly aligned.',
	);

	if (pointer === 0) {
		return;
	}
	spinlock();

	let header = pointer - BLOCK_HEADER_SIZE;
	let size = u32[header >> 2] & ~1;
	let footer = header + size - BLOCK_FOOTER_SIZE;

	const prev = u32[(header - BLOCK_FOOTER_SIZE) >> 2];
	const next = u32[(header + size) >> 2];
	// If this is the first allocated block, spinlock() will have set
	// u32[0] to 1, so this will never observe prev being 0
	if ((prev & 1) === 0) {
		header -= prev;
		size += prev;
	}
	if ((next & 1) === 0) {
		footer += next;
		size += next;
	}

	u8.fill(0, header, footer);
	u32[header >> 2] = size;
	u32[footer >> 2] = size;
	releaseLock();
}

/**
 * Reallocates the memory at a pointer with a new size, copying data to the new location if necessary.
 * If a 0-pointer is provided, will simply `alloc`.
 *
 * Throws if there is not enough memory to allocate the specified size.
 *
 * @param pointer The pointer to reallocate
 * @param newSize The new _total_ size (in bytes) to allocate.
 * @returns The new pointer.
 */
function realloc(pointer: Pointer, newSize: number): Pointer {
	DEV_ASSERT(
		pointer % 8 === 0,
		'Invalid pointer in realloc - pointer was not correctly aligned.',
	);

	if (pointer === 0) {
		return alloc(newSize);
	}
	// TODO: Allow realloc to shrink if newSize is small enough to make this reasonable.
	const alignedSize = alignTo8(newSize);
	spinlock();
	const header = pointer - BLOCK_HEADER_SIZE;
	const size = u32[header >> 2] & ~1;
	const payloadSize = size - BLOCK_METADATA_SIZE;
	if (payloadSize >= alignedSize) {
		releaseLock();
		return pointer;
	}

	const next = header + size;
	const nextSize = u32[next >> 2];

	if (
		(nextSize & 1) === 0 &&
		nextSize - BLOCK_METADATA_SIZE >= alignedSize - size
	) {
		const remainderSize = alignedSize - payloadSize;
		const shouldSplit = nextSize - remainderSize >= MINIMUM_BLOCK_SIZE;
		const newBlockSize = shouldSplit
			? alignedSize + BLOCK_METADATA_SIZE
			: size + nextSize;

		u32[next >> 2] = 0;
		u32[(next - BLOCK_FOOTER_SIZE) >> 2] = 0;

		u32[header >> 2] = newBlockSize | 1;
		u32[(header + newBlockSize - BLOCK_FOOTER_SIZE) >> 2] =
			newBlockSize | 1;

		if (shouldSplit) {
			const splitSize = size + nextSize - newBlockSize;
			u32[(header + newBlockSize) >> 2] = splitSize;
			u32[(header + newBlockSize + splitSize - BLOCK_FOOTER_SIZE) >> 2] =
				splitSize;
		}
		releaseLock();
		return pointer;
	}

	releaseLock();
	const newPointer = alloc(alignedSize);
	copy(pointer, payloadSize, newPointer);
	free(pointer);
	return newPointer;
}

/**
 * Copies memory from one location to another.
 * @param from The location to copy from.
 * @param length The length (in bytes) to copy.
 * @param to The destination to copy to.
 */
function copy(from: Pointer, length: number, to: Pointer): void {
	u8.copyWithin(to, from, from + length);
}

/**
 * Sets memory in a range to a particular value.
 * @param from The location to start setting at.
 * @param length The number of bytes to set.
 * @param value The value to set them to.
 */
function set(from: Pointer, length: number, value: number): void {
	u8.fill(value, from, from + length);
}

/**
 * Copies the data at the provided pointer to a newly allocated pointer.
 * If a 0-pointer is provided, returns the 0-pointer.
 * @param pointer The pointer to copy.
 * @returns The newly allocated pointer with data copied from the passed pointer.
 */
function copyPointer(pointer: Pointer): Pointer {
	if (pointer === 0) {
		return 0;
	}
	const size =
		(u32[(pointer - BLOCK_HEADER_SIZE) >> 2] & ~1) - BLOCK_METADATA_SIZE;
	const newPointer = alloc(size);
	copy(pointer, size, newPointer);
	return newPointer;
}

/**
 * Treats the value at the specified pointer as a pointer and reallocates it.
 * @param location The location to treat as a pointer and reallocate at.
 * @param size The size of the new allocation
 */
function reallocAt(location: Pointer, newSize: number): void {
	DEV_ASSERT(
		location % 4 === 0,
		'Invalid pointer in reallocAt - pointer was not correctly aligned',
	);
	u32[location >> 2] = realloc(u32[location >> 2], newSize);
}

/**
 * **UNSAFE**
 *
 * Clears all allocated memory, resetting the entire buffer as if it were just initialized.
 * Previous pointers will no longer be safe to use and could result in memory corruption.
 * Only use for testing.
 */
function UNSAFE_CLEAR_ALL(): void {
	if (buffer) {
		set(0, buffer.byteLength, 0);
		u32[1] = buffer.byteLength - 8;
		u32[u32.length - 2] = buffer.byteLength - 8;
		u32[u32.length - 1] = 1;
	}
}

export const Memory = {
	init,
	get isInitialized() {
		return buffer !== undefined;
	},

	alloc,
	free,

	realloc,
	reallocAt,

	copy,
	copyPointer,
	set,

	buffer: null as any as ArrayBuffer,
	u8: null as any as Uint8Array,
	u16: null as any as Uint16Array,
	u32: null as any as Uint32Array,
	u64: null as any as BigUint64Array,
	i8: null as any as Int8Array,
	i16: null as any as Int16Array,
	i32: null as any as Int32Array,
	i64: null as any as BigInt64Array,
	f32: null as any as Float32Array,
	f64: null as any as Float64Array,
	dataview: null as any as DataView,

	UNSAFE_CLEAR_ALL,
};
export type Memory = typeof Memory;

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, beforeEach } = import.meta.vitest;

	beforeEach(() => Memory.UNSAFE_CLEAR_ALL());

	describe('alloc', () => {
		it('returns a pointer', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			expect(ptr1).toBe(8);

			const ptr2 = Memory.alloc(16);
			expect(ptr2).toBe(24);
		});

		it('throws when out of memory', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(232);
			expect(ptr1).toBe(8);

			expect(() => Memory.alloc(8)).toThrow(/Out of memory/);
		});
	});

	describe('free', () => {
		it('clears a block and allows it to be allocated again', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			expect(ptr1).toBe(8);

			Memory.free(ptr1);
			const ptr2 = Memory.alloc(8);
			expect(ptr2).toBe(ptr1);
		});

		it('clears all memory in a block', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			const heldBlock = Memory.alloc(8);
			u32[(ptr1 >> 2) + 1] = 2 ** 32 - 1;

			Memory.free(ptr1);
			const ptr2 = Memory.alloc(8);
			expect(ptr2).toBe(ptr1);
			expect(u32[(ptr2 >> 2) + 1]).toBe(0);
		});

		it('collects the next block if free', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			expect(ptr1).toBe(8);

			Memory.free(ptr1);
			const ptr2 = Memory.alloc(16);
			expect(ptr2).toBe(8);
		});

		it('collects the previous block if free', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			expect(ptr1).toBe(8);
			const ptr2 = Memory.alloc(8);
			expect(ptr2).toBe(24);

			Memory.free(ptr1);
			Memory.free(ptr2);

			const ptr3 = Memory.alloc(16);
			expect(ptr3).toBe(8);
		});
	});

	describe('realloc', () => {
		it('returns the same pointer if allocated block is large enough already', () => {
			Memory.init(256);
			const ptr = Memory.alloc(3); // This is pushed to 8
			const newPtr = Memory.realloc(ptr, 5);
			expect(newPtr).toBe(ptr);
			const newerPtr = Memory.realloc(newPtr, 7);
			expect(newerPtr).toBe(ptr);
			const newestPtr = Memory.realloc(newerPtr, 7);
			expect(newestPtr).toBe(ptr);
		});

		it('returns the same pointer if following block can be used', () => {
			Memory.init(256);
			const ptr = Memory.alloc(8);
			const newPtr = Memory.realloc(ptr, 16);
			expect(newPtr).toBe(ptr);
		});

		it('returns the same pointer and entire following block, if necessary', () => {
			Memory.init(256);
			const ptr1 = Memory.alloc(8);
			const ptr2 = Memory.alloc(8);
			const heldPtr = Memory.alloc(8);
			Memory.free(ptr2);
			const ptr1Grow = Memory.realloc(ptr1, 12);
			expect(ptr1Grow).toBe(ptr1);
		});
	});

	describe('copyPointer', () => {
		it('allocates a new pointer and copies data from the source', () => {
			Memory.init(256);
			const ALLOCATION_SIZE = 16;
			const ptr1 = Memory.alloc(ALLOCATION_SIZE);
			Memory.u32[ptr1 >> 2] = ~0 >>> 0;
			Memory.u32[(ptr1 + 4) >> 2] = ~0 >>> 0;
			const copiedPtr = Memory.copyPointer(ptr1);

			expect(Memory.u32[(copiedPtr - BLOCK_HEADER_SIZE) >> 2]).toBe(
				(ALLOCATION_SIZE + BLOCK_METADATA_SIZE) | 1,
			);
			expect(Memory.u32[(copiedPtr + ALLOCATION_SIZE) >> 2]).toBe(
				(ALLOCATION_SIZE + BLOCK_METADATA_SIZE) | 1,
			);
			expect(Memory.u32[copiedPtr >> 2]).toBe(~0 >>> 0);
			expect(Memory.u32[(copiedPtr + 4) >> 2]).toBe(~0 >>> 0);
		});
	});

	describe('spinlock', () => {
		it('sets NULL_POINTER to 1 when locked, 0 when unlocked', () => {
			Memory.init(256);
			expect(u32[0 >> 2]).toBe(0);
			spinlock();
			expect(u32[0 >> 2]).toBe(1);
			releaseLock();
			expect(u32[0 >> 2]).toBe(0);
		});
	});

	describe('reallocAt', () => {
		it('reallocates at a specific position', () => {
			Memory.init(256);
			const pointerToPointer = Memory.alloc(4);
			expect(u32[pointerToPointer >> 2]).toBe(0);
			const prevPointer = Memory.alloc(8);
			// Grab the next block so that we can't allocate in-place
			const holdOnNextBlock = Memory.alloc(8);
			u32[pointerToPointer >> 2] = prevPointer;
			expect(u32[pointerToPointer >> 2]).toBe(prevPointer);
			Memory.reallocAt(pointerToPointer, 16);
			expect(u32[pointerToPointer >> 2]).not.toBe(prevPointer);
		});
	});
}
