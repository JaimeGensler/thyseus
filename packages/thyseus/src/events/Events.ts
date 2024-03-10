import type { Class } from '../components';
import type { World } from '../world';

import { EventReader, EventWriter } from './EventQueues';

/**
 * A resource responsible for creating & holding all event queues in a world.
 */
export class Events {
	/**
	 * An array of `EventReaders` in a world.
	 * Each member in the `readers` array has a corresponding member at the same index in `writers`.
	 */
	readers: EventReader<any>[];
	/**
	 * An array of `EventWriters` in a world.
	 * Each member in the `writers` array has a corresponding member at the same index in `readers`.
	 */
	writers: EventWriter<any>[];

	static fromWorld() {
		return new this();
	}
	constructor() {
		this.readers = [];
		this.writers = [];
	}

	#addType<T extends Class>(
		type: Class,
		isRead: 'readers',
	): EventReader<InstanceType<T>>;
	#addType<T extends Class>(
		type: Class,
		isRead: 'writers',
	): EventWriter<InstanceType<T>>;
	#addType(type: Class, accessType: 'readers' | 'writers') {
		const id = this.readers.length;
		const eventQueue: object[] = [];
		this.readers.push(new EventReader(type, eventQueue, id));
		this.writers.push(new EventWriter(type, eventQueue, id));
		return this[accessType][id];
	}

	getReader<T extends Class>(eventType: T): EventReader<InstanceType<T>> {
		return (
			this.readers.find(reader => reader.type === eventType) ??
			this.#addType(eventType, 'readers')
		);
	}
	getWriter<T extends Class>(eventType: T): EventWriter<InstanceType<T>> {
		return (
			this.writers.find(writer => writer.type === eventType) ??
			this.#addType(eventType, 'writers')
		);
	}
}
