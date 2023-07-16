import { Memory } from '../utils';
import { ClearEventQueueCommand, type Commands } from '../commands';
import type { Struct } from '../struct';

export class EventReader<T extends object> {
	#commands: Commands;
	#struct: Struct;
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, __, ...defaultData]

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		pointer: number,
		instance: T = new struct() as T,
	) {
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
		return Memory.u32[this.#pointer];
	}

	*[Symbol.iterator](): this extends EventWriter<any>
		? Iterator<T>
		: Iterator<Readonly<T>> {
		const size = this.#struct.size!;
		this.#instance.__$$b = Memory.u32[this.#pointer + 2];
		for (let i = 0; i < this.length; i++) {
			yield this.#instance;
			this.#instance.__$$b += size;
		}
	}

	/**
	 * Sets this event queue to be cleared when commands are next processed.
	 */
	clear() {
		const command = this.#commands.push(ClearEventQueueCommand);
		command.queueLengthPointer = this.#pointer << 2;
		command.serialize();
	}
}

export class EventWriter<T extends object> extends EventReader<T> {
	#instance: T & { __$$b: number };
	#pointer: number; // [length, capacity, pointerStart, __, ...defaultData]

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		pointer: number,
	) {
		const instance = new struct() as T & { __$$b: number };
		super(commands, struct, pointer, instance);
		this.#instance = instance;
		this.#pointer = pointer >> 2; // Shifted for u32-only access.
	}

	/**
	 * Creates an event on the queue from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	create(instance: T): void {
		const previous = (instance as any).__$$b;
		(instance as any).__$$b = this.#addEvent();
		(instance as any).serialize();
		(instance as any).__$$b = previous;
	}

	/**
	 * Creates an event with the default data for that event.
	 */
	createDefault(): void {
		const from = (this.#pointer << 2) + 16;
		const to = this.#addEvent();
		Memory.copy(from, this.type.size!, to);
		this.type.copy?.(from, to);
	}

	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearImmediate(): void {
		Memory.u32[this.#pointer] = 0;
	}

	/**
	 * Increments length, returns a pointer to the new event (in queue).
	 * Will grow queue, if necessary.
	 */
	#addEvent(): number {
		const { length } = this;
		if (length === Memory.u32[this.#pointer + 1] && this.type.size !== 0) {
			// Add space for 8 more events
			Memory.reallocAt(
				(this.#pointer + 2) << 2,
				length * this.type.size! + 8 * this.type.size!,
			);
			Memory.u32[this.#pointer + 1] += 8;
		}
		Memory.u32[this.#pointer]++;
		return Memory.u32[this.#pointer + 2] + length * this.type.size!;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach, vi } = import.meta.vitest;
	const { World } = await import('../world');

	async function setupQueue<T extends Struct, I extends InstanceType<T>>(
		queueType: T,
	) {
		const world = await World.new({ isMainThread: true }).build();
		const pointer = Memory.alloc(16 + queueType.size!);
		const instance = new queueType() as {
			__$$b: number;
			serialize(): void;
		};
		instance.__$$b = pointer + 16;
		instance.serialize();
		return [
			new EventReader<I>(world.commands, queueType as any, pointer),
			new EventWriter<I>(world.commands, queueType as any, pointer),
			world,
		] as const;
	}

	class A {
		static size = 4;
		static alignment = 4;
		__$$b = 0;
		deserialize() {
			this.value = Memory.u32[this.__$$b >> 2];
		}
		serialize() {
			Memory.u32[this.__$$b >> 2] = this.value;
		}

		value: number;
		constructor(val = 3) {
			this.value = val;
		}
	}

	beforeEach(() => {
		Memory.init(5000);
		return () => Memory.UNSAFE_CLEAR_ALL();
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

	it('EventWriter.create() creates an event from the passed instance', async () => {
		const [reader, writer] = await setupQueue(A);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.create(new A(16));
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);

		let iterations = 0;
		for (const readInstance of reader) {
			readInstance.deserialize();
			expect(readInstance).toBeInstanceOf(A);
			expect(readInstance.value).toBe(16);
			iterations++;
		}
		expect(iterations).toBe(1);
	});

	it('clear() queues a clear command', async () => {
		const [reader, writer, world] = await setupQueue(A);
		const pushCommandSpy = vi.spyOn(world.commands, 'push');
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.create(new A(16));
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);

		expect(reader.clear());
		expect(pushCommandSpy).toHaveBeenCalledOnce();
		expect(pushCommandSpy).toHaveBeenCalledWith(ClearEventQueueCommand);

		expect(writer.clear());
		expect(pushCommandSpy).toHaveBeenCalledTimes(2);
		expect(pushCommandSpy).toHaveBeenLastCalledWith(ClearEventQueueCommand);
	});

	it('never allocates a queue for ZSTs', async () => {
		class ZST {
			static size = 0;
			static alignment = 1;
			deserialize() {}
			serialize() {}
		}
		const [, zstWriter] = await setupQueue(ZST);
		const [, sizedWriter] = await setupQueue(A);
		const reallocSpy = vi.spyOn(Memory, 'reallocAt');
		expect(reallocSpy).not.toHaveBeenCalled();

		for (let i = 0; i < 10; i++) {
			zstWriter.createDefault();
			expect(reallocSpy).not.toHaveBeenCalled();
		}

		sizedWriter.createDefault();
		expect(reallocSpy).toHaveBeenCalledTimes(1);
	});

	it.todo('calls copy if component has copy', async () => {
		class CopyClass {
			static copy(from: number, to: number) {}
			static size = 1;
			static alignment = 1;
		}
		const copySpy = vi.spyOn(CopyClass, 'copy');
		const [, writer] = await setupQueue(CopyClass);
		expect(copySpy).toHaveBeenCalledTimes(0);
		expect(writer.length).toBe(0);
		writer.createDefault();
		expect(copySpy).toHaveBeenCalledTimes(1);

		writer.create(new CopyClass());
		expect(copySpy).toHaveBeenCalledTimes(2);
	});
}
