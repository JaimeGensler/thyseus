import { memory, type MemoryViews } from '../utils/memory';
import type { Struct } from '../struct';

export class EventReader<T> {
	#struct: Struct;
	#instance: T & { __$$b: number; __$$s: MemoryViews };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(struct: Struct & { new (): T }, pointer: number) {
		this.#instance = new struct() as any;
		this.#struct = struct;
		this.#pointer = pointer >> 2; // Shifted for u32-only access
		this.#instance.__$$s = memory.views;
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
	#instance: T & { __$$b: number; __$$s: MemoryViews };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(struct: Struct & { new (): T }, pointer: number) {
		this.#struct = struct;
		this.#instance = new struct() as any;
		this.#pointer = pointer >> 2; // Shifted for u32-only access.
		this.#instance.__$$s = memory.views;
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
	 * Returned instance will be reused.
	 *
	 * @returns A mutable instance of the event.
	 */
	create(): T {
		const byteOffset = this.#addEvent();
		this.#instance.__$$b = byteOffset;
		memory.copy((this.#pointer + 3) << 2, this.#struct.size!, byteOffset);
		return this.#instance;
	}

	/**
	 * Creates an event on the queue from a passed instance of a struct.
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
			(this.#pointer + 3) << 2,
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
	 * Increments length, returns a pointer to the new event (in queue).
	 * Will grow queue, if necessary.
	 */
	#addEvent(): number {
		const length = this.length;
		if (length === memory.views.u32[this.#pointer + 1]) {
			// Add space for 8 more events
			memory.views.u32[this.#pointer + 2] = memory.realloc(
				memory.views.u32[this.#pointer + 2],
				length * this.#struct.size! + 8 * this.#struct.size!,
			);
			memory.views.u32[this.#pointer + 1] += 8;
		}
		memory.views.u32[this.#pointer]++;
		return (
			length * this.#struct.size! + memory.views.u32[this.#pointer + 2]
		);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;
	const { struct } = await import('../struct');
	const { initStruct } = await import('../storage');

	const setupQueue = <T extends Struct>(queueType: T) => {
		const pointer = memory.alloc(12 + queueType.size!);
		memory.views.u8.set((new queueType() as any).__$$s.u8, pointer + 12);
		return [
			new EventReader<InstanceType<T>>(queueType as any, pointer),
			new EventWriter<InstanceType<T>>(queueType as any, pointer),
		] as const;
	};
	@struct
	class A {
		@struct.u32 declare value: number;
		constructor(val = 3) {
			initStruct(this);
			this.value = val;
		}
	}

	beforeEach(() => {
		memory.init(1024);
		return () => memory.UNSAFE_CLEAR_ALL();
	});

	it('EventReader.type and EventWriter.type point to the struct', () => {
		const [reader, writer] = setupQueue(A);
		expect(reader.type).toBe(A);
		expect(writer.type).toBe(A);
	});

	it('EventWriter.createDefault adds (default) events', () => {
		const [reader, writer] = setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		for (let i = 1; i <= 3; i++) {
			writer.createDefault();
			expect(reader.length).toBe(i);
			expect(writer.length).toBe(i);
		}

		let iterations = 0;
		for (const a of reader) {
			expect(a).toBeInstanceOf(A);
			expect(a.value).toBe(3);
			iterations++;
		}
		expect(iterations).toBe(3);
	});

	it('EventWriter.clearAll() clears events immediately', () => {
		const [reader, writer] = setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.createDefault();
		writer.createDefault();
		expect(reader.length).toBe(2);
		expect(writer.length).toBe(2);

		writer.clearAll();
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);
	});

	it('EventWriter.create() creates an event and returns a handle', () => {
		const [reader, writer] = setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		const writeInstance = writer.create();
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);
		expect(writeInstance).toBeInstanceOf(A);
		expect(writeInstance.value).toBe(3);
		writeInstance.value = 10;

		let iterations = 0;
		for (const readInstance of reader) {
			expect(readInstance).toBeInstanceOf(A);
			expect(readInstance.value).toBe(10);
			iterations++;
		}
		expect(iterations).toBe(1);
	});

	it('EventWriter.createFrom() creates an event from the passed instance', () => {
		const [reader, writer] = setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.createFrom(new A(16));
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);

		let iterations = 0;
		for (const readInstance of reader) {
			expect(readInstance).toBeInstanceOf(A);
			expect(readInstance.value).toBe(16);
			iterations++;
		}
		expect(iterations).toBe(1);
	});
}
