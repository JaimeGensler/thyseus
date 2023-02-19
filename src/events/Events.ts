import { memory } from '../utils/memory';
import type { Struct } from '../struct';

export class EventReader<T> {
	#struct: Struct;
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(struct: Struct & { new (): T }, pointer: number) {
		this.#instance = new struct() as any;
		this.#struct = struct;
		this.#pointer = pointer >> 2; // Shifted for u32-only access
	}

	/**
	 * The event type (struct) for this queue.
	 */
	get type(): Struct {
		return this.#struct;
	}

	/**
	 * The number of events of this type currently in the queue.
	 */
	get length(): number {
		return memory.views.u32[this.#pointer];
	}

	*[Symbol.iterator](): Generator<T> {
		const size = this.#struct.size!;
		this.#instance.__$$b = memory.views.u32[this.#pointer + 2];
		for (let i = 0; i < this.length; i++) {
			yield this.#instance;
			this.#instance.__$$b += size;
		}
	}

	/**
	 * Sets this event queue to be cleared when commands are next processed.
	 */
	clear() {
		// TODO
	}
}

export class EventWriter<T> {
	#struct: Struct;
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(struct: Struct & { new (): T }, pointer: number) {
		this.#struct = struct;
		this.#instance = new struct() as any;
		this.#pointer = pointer >> 2; // Shifted for u32-only access.
	}

	/**
	 * The event type (struct) for this queue.
	 */
	get type(): Struct {
		return this.#struct;
	}

	/**
	 * The number of events of this type currently in the queue.
	 */
	get length(): number {
		return memory.views.u32[this.#pointer];
	}

	/**
	 * Creates a new event and returns a mutable instance of that event.
	 *
	 * Returned objects will be reused.
	 *
	 * @returns A mutable instance of the event.
	 */
	create(): T {
		this.#instance.__$$b = this.#addEvent();
		return this.#instance;
	}

	/**
	 * Creates an event from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	createFrom(instance: T): void {
		const byteOffset = (instance as any).__$$b;
		memory.views.u8.set(
			(instance as any).__$$s.u8.subarray(
				byteOffset,
				byteOffset + this.#struct.size!,
			),
			this.#addEvent(),
		);
	}

	/**
	 * Creates an event with the default data for that event.
	 */
	createDefault(): void {
		memory.copy(
			memory.views.u32[this.#pointer + 3],
			this.#struct.size!,
			this.#addEvent(),
		);
	}

	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearAll(): void {
		memory.views.u32[this.#pointer] = 0;
	}

	/**
	 * Ensures enough space exists to add an event, increments length, returns a pointer to the new event (in queue).
	 */
	#addEvent(): number {
		// TODO: Grow if necessary
		const length = this.length;
		memory.views.u32[this.#pointer]++;
		return (
			length * this.#struct.size! + memory.views.u32[this.#pointer + 2]
		);
	}
}
