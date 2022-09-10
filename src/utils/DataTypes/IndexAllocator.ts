import { ThreadProtocol } from '../Thread';

// NOTE: Requires n is non-zero
const ctz32 = (n: number) => {
	n >>>= 0;
	return 31 - Math.clz32(n & -n);
};

enum DataIndex {
	NextId = 0,
	FreeCount = 1,
	MaxCount = 2,
}

/**
 * A thread-safe, lock-free class to allocate/free indices.
 */
export default class IndexAllocator {
	#data: Uint32Array;
	#free: Uint32Array;

	static with(maxCount: number, isShared: boolean): IndexAllocator {
		const BufferConstructor = isShared ? SharedArrayBuffer : ArrayBuffer;
		return new this(
			new Uint32Array(new BufferConstructor(16)),
			new Uint32Array(new BufferConstructor(maxCount)),
		);
	}

	constructor(data: Uint32Array, free: Uint32Array) {
		this.#data = data;
		this.#free = free;
	}

	get(): number {
		for (let i = 0; i < this.#free.length; i++) {
			if (Atomics.load(this.#data, DataIndex.FreeCount) === 0) {
				break;
			}
			while (true) {
				const n = Atomics.load(this.#free, i);
				if (n === 0) {
					break;
				}
				const result = ctz32(n);
				if (Atomics.xor(this.#free, i, 0b1 << result) === n) {
					Atomics.sub(this.#data, DataIndex.FreeCount, 1);
					return 32 * i + result;
				}
			}
		}

		const result = Atomics.add(this.#data, DataIndex.NextId, 1);
		if (result === 0xffff_ffff) {
			throw new Error('Too many entities spawned!');
		}
		return result;
	}

	free(index: number): void {
		if (
			(Atomics.or(this.#free, index >> 5, 1 << (index & 0b0001_1111)) &
				(1 << (index & 0b0001_1111))) ===
			0
		) {
			Atomics.add(this.#data, DataIndex.FreeCount, 1);
		}
	}

	[ThreadProtocol.Send](): SerializedIA {
		return [this.#data, this.#free];
	}
	static [ThreadProtocol.Receive]([data, free]: SerializedIA) {
		return new this(data, free);
	}
}
type SerializedIA = [Uint32Array, Uint32Array];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	it('ctz counts trailing zeroes', () => {
		for (let i = 0; i < 32; i++) {
			expect(ctz32(Number(`0b1${'0'.repeat(i)}`))).toBe(i);
		}
	});

	it('returns incrementing integers', () => {
		const alloc = IndexAllocator.with(256, false);

		for (let i = 0; i < 256; i++) {
			expect(alloc.get()).toBe(i);
		}
	});

	it('returns freed indices if possible', () => {
		const alloc = IndexAllocator.with(64, false);

		for (let i = 0; i < 32; i++) {
			alloc.get();
		}
		const frees = [1, 2, 3, 9, 10, 16, 24, 25];
		frees.forEach(i => alloc.free(i));

		for (const i of frees) {
			expect(alloc.get()).toBe(i);
		}
		for (let i = 32; i < 64; i++) {
			expect(alloc.get()).toBe(i);
		}
	});

	it('is Thread sendable', () => {
		const alloc1 = IndexAllocator.with(64, false);
		const alloc2 = IndexAllocator[ThreadProtocol.Receive](
			alloc1[ThreadProtocol.Send](),
		);

		expect(alloc1.get()).toBe(0);
		expect(alloc2.get()).toBe(1);
		expect(alloc1.get()).toBe(2);
		expect(alloc2.get()).toBe(3);

		alloc1.free(1);
		alloc2.free(2);
		expect(alloc2.get()).toBe(1);
		expect(alloc1.get()).toBe(2);
		expect(alloc1.get()).toBe(4);
		expect(alloc2.get()).toBe(5);
	});
}
