import Thread from '../utils/Thread';

export default class SparseSet {
	dense: Uint32Array;
	sparse: Uint32Array;
	#meta: Uint32Array;

	static with(length: number, isShared = false) {
		const BufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
		return new this(
			new Uint32Array(new BufferType(length * 4)),
			new Uint32Array(new BufferType(length * 4)),
			new Uint32Array(new BufferType(4)),
		);
	}

	constructor(
		sparse: Uint32Array,
		dense: Uint32Array,
		metadata: Uint32Array,
	) {
		this.sparse = sparse;
		this.dense = dense;
		this.#meta = metadata;
	}

	get size(): number {
		return this.#meta[0];
	}
	set size(value: number) {
		this.#meta[0] = value;
	}

	has(value: number) {
		return (
			this.dense[this.sparse[value]] === value &&
			this.sparse[value] < this.size
		);
	}

	add(value: number) {
		if (this.has(value)) {
			return this;
		}
		// A different option here is something like:
		// const trueValue = value % this.sparse.length
		// Wraps around when value greater than the set's max length
		// and prevents this runtime error handling case.
		if (this.sparse.length <= value) {
			throw new RangeError('Invalid index');
		}
		this.sparse[value] = this.size;
		this.dense[this.size] = value;
		this.size++;
		return this;
	}

	delete(value: number) {
		if (!this.has(value)) {
			return false;
		}
		this.size--;
		const sparseVal = this.sparse[value];
		this.dense[sparseVal] = this.dense[this.size];
		this.sparse[this.dense[sparseVal]] = sparseVal;
		return true;
	}

	clear() {
		this.size = 0;
	}

	*[Symbol.iterator]() {
		const size = this.size;
		for (let i = 0; i < size; i++) {
			yield this.dense[i];
		}
	}

	[Thread.Send](): SerializedSparseSet {
		return [this.sparse, this.dense, this.#meta];
	}
	static [Thread.Receive]([
		sparse,
		dense,
		meta,
	]: SerializedSparseSet): SparseSet {
		return new this(sparse, dense, meta);
	}
}
type SerializedSparseSet = [
	sparse: Uint32Array,
	dense: Uint32Array,
	meta: Uint32Array,
];

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe('SparseSet', () => {
		const elements = [1, 7, 2, 15, 9, 0, 4];

		it('adds elements', () => {
			const set = SparseSet.with(16);
			expect(set.size).toBe(0);
			for (const element of elements) {
				set.add(element);
			}
			for (const element of elements) {
				expect(set.has(element)).toBe(true);
			}
			expect(set.size).toBe(elements.length);
		});

		it('deletes elements', () => {
			const set = SparseSet.with(16);
			for (let i = 0; i < 16; i++) {
				set.add(i);
			}
			for (const element of elements) {
				set.delete(element);
			}
			for (const element of elements) {
				expect(set.has(element)).toBe(false);
			}
			expect(set.size).toBe(16 - elements.length);
		});

		it('iterates', () => {
			const set = SparseSet.with(16);
			for (const element of elements) {
				set.add(element);
			}
			expect([...set]).toStrictEqual(elements);
		});

		it('throws a RangeError when trying to add an element out of range', () => {
			const set = SparseSet.with(16);
			set.add(3);
			expect(set.has(3)).toBe(true);
			expect(() => set.add(16)).toThrow(RangeError);
			expect(() => set.add(64)).toThrow(RangeError);
		});
		it('returns false when checking presence of out of range elements', () => {
			const set = SparseSet.with(16);
			for (let i = 0; i < 16; i++) {
				set.add(i);
				expect(set.has(i)).toBe(true);
			}
			expect(set.has(16)).toBe(false);
			expect(set.has(64)).toBe(false);
		});

		it('desconstructs to and reconstructs from shareable interface', () => {
			const set = SparseSet.with(8);

			const shareableInterface = set[Thread.Send]();
			expect(shareableInterface).toStrictEqual([
				new Uint32Array(8),
				new Uint32Array(8),
				new Uint32Array(1),
			]);

			const reconstructed = SparseSet[Thread.Receive](shareableInterface);
			expect(set).toStrictEqual(reconstructed);
		});
	});
}
