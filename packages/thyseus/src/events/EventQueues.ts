import type { Commands } from '../commands';
import type { Class } from '../components';
import { ClearEventQueueCommand } from './ClearEventQueueCommand';

export class EventReader<T extends object> {
	#commands: Commands;
	#type: Class;
	#id: number;
	#queue: T[];

	constructor(
		commands: Commands,
		type: { new (...args: any[]): T },
		queue: T[],
		id: number,
	) {
		this.#commands = commands;
		this.#type = type;
		this.#queue = queue;
		this.#id = id;
	}

	/**
	 * The number of events currently in this queue.
	 */
	get length() {
		return this.#queue.length;
	}

	/**
	 * The event type for this queue.
	 */
	get type(): Class {
		return this.#type;
	}

	[Symbol.iterator](): IterableIterator<Readonly<T>> {
		return this.#queue[Symbol.iterator]();
	}

	/**
	 * Sets this event queue to be cleared when commands are next processed.
	 */
	clear() {
		this.#commands.push(new ClearEventQueueCommand(this.#id));
	}
}

export class EventWriter<T extends object> extends EventReader<T> {
	#queue: T[];

	constructor(
		commands: Commands,
		type: { new (...args: any[]): T },
		queue: T[],
		id: number,
	) {
		super(commands, type, queue, id);
		this.#queue = queue;
	}

	/**
	 * Creates an event on the queue from a passed instance of a struct.
	 * @param instance The event to add to the event queue.
	 */
	create(instance: T): void {
		this.#queue.push(instance);
	}

	/**
	 * **Immediately** clears all events in this queue.
	 */
	clearImmediate(): void {
		this.#queue.length = 0;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');

	async function setupQueue<T extends Class, I extends InstanceType<T>>(
		queueType: T,
	) {
		const world = await World.new().build();
		const queue: I[] = [];
		return [
			new EventReader<I>(world.commands, queueType as any, queue, 0),
			new EventWriter<I>(world.commands, queueType as any, queue, 0),
			world,
		] as const;
	}

	class A {
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

	it('EventWriter.clearImmediate() clears events immediately', async () => {
		class MyEvent {}
		const [reader, writer] = await setupQueue(MyEvent);
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.create(new MyEvent());
		writer.create(new MyEvent());
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

	it('EventReader.clear() queues a clear command', async () => {
		const [reader, writer, world] = await setupQueue(A);
		const pushCommandSpy = vi.spyOn(world.commands, 'push');
		expect(reader.length).toBe(0);
		expect(writer.length).toBe(0);

		writer.create(new A(16));
		expect(reader.length).toBe(1);
		expect(writer.length).toBe(1);

		expect(reader.clear());
		expect(pushCommandSpy).toHaveBeenCalledOnce();
		const command = new ClearEventQueueCommand(0);
		expect(pushCommandSpy).toHaveBeenCalledWith(command);

		expect(writer.clear());
		expect(pushCommandSpy).toHaveBeenCalledTimes(2);
		expect(pushCommandSpy).toHaveBeenLastCalledWith(command);
	});
}
