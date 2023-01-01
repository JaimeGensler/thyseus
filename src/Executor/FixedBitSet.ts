export class FixedBitSet {
	static getBufferLength(count: number): number {
		return (count + 31) >> 2;
	}
	#bits: Uint32Array;
	length: number;
	constructor(
		length: number,
		createBuffer: (byteLength: number) => ArrayBufferLike,
	) {
		this.length = length;
		this.#bits = new Uint32Array(createBuffer(0));
	}

	set(bit: number) {}
	clear(bit: number) {}

	overlaps(n: bigint) {
		// TODO
		return false;
	}

	find(cb: (bit: number) => boolean) {
		return -1;
	}

	hasSetBits() {
		// TODO
		return false;
	}

	setCount() {
		return 0;
	}

	*setBits() {
		// TODO
		yield 0;
	}
}
