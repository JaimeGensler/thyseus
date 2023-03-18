import { memory } from '../utils/memory';
import { dropStruct } from '../storage/initStruct';
import { CLEAR_QUEUE_COMMAND, type Commands } from '../commands/Commands';
import type { Struct } from '../struct';

export class EventReader<T extends object> {
	#commands: Commands;
	#struct: Struct;
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		pointer: number,
		instance?: T,
	) {
		if (instance === undefined) {
			instance = new struct() as T;
			dropStruct(instance);
		}
		this.#commands = commands;
		this.#instance = instance as any;
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
	 * The number of events currently in this queue.
	 */
	get length(): number {
		return memory.views.u32[this.#pointer];
	}

	*[Symbol.iterator](): this extends EventWriter<any>
		? Iterator<T>
		: Iterator<Readonly<T>> {
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
		const pointer = this.#commands.pushCommand(4, CLEAR_QUEUE_COMMAND);
		memory.views.u32[pointer >> 2] = this.#pointer << 2;
	}
}

export class EventWriter<T extends object> extends EventReader<T> {
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, ...defaultData]

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		pointer: number,
	) {
		const instance = new struct() as T & { __$$b: number };
		dropStruct(instance);
		super(commands, struct, pointer, instance);
		this.#instance = instance;
		this.#pointer = pointer >> 2; // Shifted for u32-only access.
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
		memory.copy((this.#pointer + 3) << 2, this.type.size!, byteOffset);
		return this.#instance;
	}

	/**
	 * Creates an event on the queue from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	createFrom(instance: T): void {
		memory.copy((instance as any).__$$b, this.type.size!, this.#addEvent());
	}

	/**
	 * Creates an event with the default data for that event.
	 */
	createDefault(): void {
		memory.copy(
			(this.#pointer + 3) << 2,
			this.type.size!,
			this.#addEvent(),
		);
	}

	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearImmediate(): void {
		memory.views.u32[this.#pointer] = 0;
	}

	/**
	 * Increments length, returns a pointer to the new event (in queue).
	 * Will grow queue, if necessary.
	 */
	#addEvent(): number {
		const { length } = this;
		if (
			length === memory.views.u32[this.#pointer + 1] &&
			this.type.size !== 0
		) {
			// Add space for 8 more events
			memory.reallocAt(
				(this.#pointer + 2) << 2,
				length * this.type.size! + 8 * this.type.size!,
			);
			memory.views.u32[this.#pointer + 1] += 8;
		}
		memory.views.u32[this.#pointer]++;
		return length * this.type.size! + memory.views.u32[this.#pointer + 2];
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach, vi } = import.meta.vitest;
	const { struct } = await import('../struct');
	const { initStruct } = await import('../storage');
	const { World } = await import('../world');

	async function setupQueue<T extends Struct, I extends InstanceType<T>>(
		queueType: T,
	) {
		const world = await World.new({ isMainThread: true }).build();
		const pointer = memory.alloc(12 + queueType.size!);
		const instance = new queueType() as { __$$b: number };
		memory.copy(instance.__$$b, queueType.size!, pointer + 12);
		memory.free(instance.__$$b);
		return [
			new EventReader<I>(world.commands, queueType as any, pointer),
			new EventWriter<I>(world.commands, queueType as any, pointer),
			world,
		] as const;
	}

	@struct
	class A {
		@struct.u32 declare value: number;
		constructor(val = 3) {
			initStruct(this);
			this.value = val;
		}
	}

	beforeEach(() => {
		memory.init(5000);
		return () => memory.UNSAFE_CLEAR_ALL();
	});

	it('EventReader.type and EventWriter.type point to the struct', async () => {
		const [reader, writer] = await setupQueue(A);
		expect(reader.type).toBe(A);
		expect(writer.type).toBe(A);
	});

	it('EventWriter.createDefault adds (default) events', async () => {
		const [reader, writer] = await setupQueue(A);
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

		iterations = 0;
		for (const a of writer) {
			expect(a).toBeInstanceOf(A);
			expect(a.value).toBe(3);
			iterations++;
		}
		expect(iterations).toBe(3);
	});

	it('EventWriter.clearAll() clears events immediately', async () => {
		const [reader, writer] = await setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.createDefault();
		writer.createDefault();
		expect(reader.length).toBe(2);
		expect(writer.length).toBe(2);

		writer.clearImmediate();
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);
	});

	it('EventWriter.create() creates an event and returns a handle', async () => {
		const [reader, writer] = await setupQueue(A);
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

	it('EventWriter.createFrom() creates an event from the passed instance', async () => {
		const [reader, writer] = await setupQueue(A);
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

	it('clear() queues a clear command', async () => {
		const [reader, writer, world] = await setupQueue(A);
		const pushCommandSpy = vi.spyOn(world.commands, 'pushCommand');
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.createFrom(new A(16));
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);

		expect(reader.clear());
		expect(pushCommandSpy).toHaveBeenCalledOnce();
		expect(pushCommandSpy).toHaveBeenCalledWith(4, CLEAR_QUEUE_COMMAND);

		expect(writer.clear());
		expect(pushCommandSpy).toHaveBeenCalledTimes(2);
		expect(pushCommandSpy).toHaveBeenLastCalledWith(4, CLEAR_QUEUE_COMMAND);
	});

	it('never allocates a queue for ZSTs', async () => {
		class ZST {
			static size = 0;
			static alignment = 1;
			constructor() {
				initStruct(this);
			}
		}
		const [, zstWriter] = await setupQueue(ZST);
		const [, sizedWriter] = await setupQueue(A);
		const reallocSpy = vi.spyOn(memory, 'reallocAt');
		expect(reallocSpy).not.toHaveBeenCalled();

		for (let i = 0; i < 10; i++) {
			zstWriter.createDefault();
			expect(reallocSpy).not.toHaveBeenCalled();
		}

		sizedWriter.createDefault();
		expect(reallocSpy).toHaveBeenCalledTimes(1);
	});
}
