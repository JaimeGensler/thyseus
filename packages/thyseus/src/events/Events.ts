import type { Commands } from '../commands';
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
	#commands: Commands;

	static fromWorld({ commands }: World) {
		return new this(commands);
	}
	constructor(commands: Commands) {
		this.readers = [];
		this.writers = [];
		this.#commands = commands;
	}

	#createReaderWriter<T extends Class>(
		type: Class,
		isRead: 'readers',
	): EventReader<InstanceType<T>>;
	#createReaderWriter<T extends Class>(
		type: Class,
		isRead: 'writers',
	): EventWriter<InstanceType<T>>;
	#createReaderWriter(type: Class, accessType: 'readers' | 'writers') {
		const id = this.readers.length;
		const queue: object[] = [];
		this.readers.push(new EventReader(this.#commands, type, queue, id));
		this.writers.push(new EventWriter(this.#commands, type, queue, id));
		return this[accessType][id];
	}

	getReaderOfType<T extends Class>(
		eventType: T,
	): EventReader<InstanceType<T>> {
		return (
			this.readers.find(reader => reader.type === eventType) ??
			this.#createReaderWriter(eventType, 'readers')
		);
	}
	getWriterOfType<T extends Class>(
		eventType: T,
	): EventWriter<InstanceType<T>> {
		return (
			this.writers.find(writer => writer.type === eventType) ??
			this.#createReaderWriter(eventType, 'writers')
		);
	}
}
