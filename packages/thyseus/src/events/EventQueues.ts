import type { Class } from '../components';
import { World } from '../world';

import { Events } from './Events';

/**
 * A class that holds a queue of events and can be used to read those events.
 */
export class EventReader<T extends object> {
	static async intoArgument(
		world: World,
		eventType: Class,
	): Promise<EventReader<any>> {
		return (await world.getResource(Events)).getReader(eventType);
	}

	#type: Class;
	#queue: T[];
	constructor(type: { new (...args: any[]): T }, queue: T[]) {
		this.#type = type;
		this.#queue = queue;
	}

	/**
	 * The number of events currently in this queue.
	 */
	get length(): number {
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
}

/**
 * A class that holds a queue of events and can be used to read or write those events.
 */
export class EventWriter<T extends object> extends EventReader<T> {
	static async intoArgument(
		world: World,
		eventType: Class,
	): Promise<EventWriter<any>> {
		return (await world.getResource(Events)).getWriter(eventType);
	}
	#queue: T[];

	constructor(type: { new (...args: any[]): T }, queue: T[]) {
		super(type, queue);
		this.#queue = queue;
	}

	/**
	 * Adds the provided event to the queue.
	 * @param instance The event to add to the event queue.
	 * @returns `this`, for chaining.
	 */
	create(instance: T): this {
		this.#queue.push(instance);
		return this;
	}

	/**
	 * Immediately clears all events in this queue.
	 */
	clear(): void {
		this.#queue.length = 0;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { World } = await import('../world');

	async function setupQueue<T extends Class, I extends InstanceType<T>>(
		queueType: T,
	) {
		const world = new World();
		const queue: I[] = [];
		return [
			new EventReader<I>(queueType as any, queue),
			new EventWriter<I>(queueType as any, queue),
			world,
		] as const;
	}

	class A {
		value: number;
		constructor(val = 3) {
			this.value = val;
		}
	}

	it('EventReader.type and EventWriter.type point to the class', async () => {
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
}
