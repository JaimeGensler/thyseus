import { memory } from '../utils/memory';

/**
 * A `Vec<u32>`.
 */
export class Vec {
	static size = 12;
	static alignment = 4;

	static fromPointer(pointer: number) {
		return new this(pointer >> 2);
	}
	static new() {
		return new this(memory.alloc(this.size) >> 2);
	}

	// Pointer to [length, capacity, pointer] u32 values - already shifted.
	#rawPointer: number;
	constructor(pointer: number) {
		this.#rawPointer = pointer;
	}

	get length(): number {
		return memory.views.u32[this.#rawPointer];
	}
	get capacity(): number {
		return memory.views.u32[this.#rawPointer + 1];
	}
	get #pointer(): number {
		return memory.views.u32[this.#rawPointer + 2];
	}

	get(index: number): number {
		// TODO
		return 0;
	}
	set(index: number, value: number): void {
		// TODO
	}

	push(value: number): number {
		// TODO
		if (this.length === this.capacity) {
			this.grow(this.length * 2);
		}
		return this.length;
	}

	grow(newLength: number): void {
		// TODO
	}
}
