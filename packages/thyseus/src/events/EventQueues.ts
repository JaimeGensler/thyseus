import type { Commands } from '../commands';
import type { Struct, StructInstance } from '../struct';
import type { Store } from '../storage';
import { ClearEventQueueCommand } from './ClearEventQueueCommand';

export class EventReader<T extends StructInstance> {
	#commands: Commands;
	#struct: Struct;
	#instance: T;
	#id: number;
	#store: Store;

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		store: Store,
		id: number,
	) {
		this.#commands = commands;
		this.#instance = new struct() as T;
		this.#struct = struct;
		this.#store = store;
		this.#id = id;
	}

	/**
	 * The number of events currently in this queue.
	 */
	get length() {
		return this.#store.length;
	}

	/**
	 * The event type for this queue.
	 */
	get type(): Struct {
		return this.#struct;
	}

	*[Symbol.iterator](): Iterator<Readonly<T>> {
		this.#store.offset = 0;
		for (let i = 0; i < this.length; i++) {
			this.#instance.deserialize!(this.#store);
			yield this.#instance;
		}
	}

	/**
	 * Sets this event queue to be cleared when commands are next processed.
	 */
	clear() {
		this.#commands.push(ClearEventQueueCommand.with(this.#id));
	}
}

export class EventWriter<T extends StructInstance> extends EventReader<T> {
	#default: T;
	#store: Store;

	constructor(
		commands: Commands,
		struct: Struct & { new (): T },
		store: Store,
		id: number,
	) {
		super(commands, struct, store, id);
		this.#default = new struct() as T;
		this.#store = store;
	}

	/**
	 * Creates an event on the queue from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	create(instance: T): void {
		(instance as any).serialize(this.#addEvent());
	}

	/**
	 * Creates an event with the default data for that event.
	 */
	createDefault(): void {
		const instance =
			this.type.boxedSize !== 0 ? new this.type() : this.#default;
		instance.serialize!(this.#addEvent());
	}

	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearImmediate(): void {
		this.#store.length = 0;
	}

	/**
	 * Increments length, returns a pointer to the new event (in queue).
	 * Will grow queue, if necessary.
	 */
	#addEvent(): Store {
		const { size, boxedSize } = this.type;
		const offset = this.length * size!;
		const boxedOffset = this.length * boxedSize!;
		if (offset >= this.#store.byteLength) {
			this.#store.resize(this.#store.byteLength * 2 || 4 * size!);
		}
		this.#store.length++;
		this.#store.offset = offset;
		this.#store.boxedOffset = boxedOffset;
		return this.#store;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { Store } = await import('../storage');

	async function setupQueue<T extends Struct, I extends InstanceType<T>>(
		queueType: T,
	) {
		const world = await World.new()
			.registerCommand(ClearEventQueueCommand)
			.build();
		const store = new Store(4 * queueType.size!);
		return [
			new EventReader<I>(world.commands, queueType as any, store, 0),
			new EventWriter<I>(world.commands, queueType as any, store, 0),
			world,
		] as const;
	}

	class A {
		static size = 4;
		static alignment = 4;
		deserialize(store: Store) {
			this.value = store.readU32();
		}
		serialize(store: Store) {
			store.writeU32(this.value);
		}

		value: number;
		constructor(val = 3) {
			this.value = val;
		}
	}

	it('EventReader.type and EventWriter.type point to the struct', async () => {
		const [reader, writer] = await setupQueue(A);
		expect(reader.type).toBe(A);
		expect(writer.type).toBe(A);
	});

	it('EventWriter.createDefault() adds (default) events', async () => {
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

	it('EventWriter.clearImmediate() clears events immediately', async () => {
		class StructWithDrop {
			static size = 1;
			static alignment = 1;
			serialize() {}
			deserialize() {}
		}
		const [reader, writer] = await setupQueue(StructWithDrop);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.createDefault();
		writer.createDefault();
		expect(reader.length).toBe(2);
		expect(writer.length).toBe(2);
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
		const command = new ClearEventQueueCommand();
		command.eventId = 0;
		expect(pushCommandSpy).toHaveBeenCalledWith(command);

		expect(writer.clear());
		expect(pushCommandSpy).toHaveBeenCalledTimes(2);
		expect(pushCommandSpy).toHaveBeenLastCalledWith(command);
	});
}
