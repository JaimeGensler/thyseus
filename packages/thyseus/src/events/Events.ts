import { EventReader, EventWriter } from './EventQueues';
import { Memory } from '../utils';
import { Struct } from '../struct';
import { EventRegistryKey } from './EventRegistryKey';
import type { World } from '../world';

export class Events {
	static size = 0;
	static alignment = 1;
	__$$b = 0;
	deserialize() {}
	serialize() {}

	readers: EventReader<any>[] = [];
	writers: EventWriter<any>[] = [];

	static fromWorld(world: World) {
		return new this(world);
	}
	constructor(world: World) {
		// SAFETY: We know this is non-null, as the EventsRes only gets added
		// if an event queue has been registered!
		const eventTypes = world.registry.get(EventRegistryKey)!;
		let eventsPointer = world.threads.queue(() =>
			Memory.alloc(EventReader.size * eventTypes.size),
		);
		for (const eventType of eventTypes) {
			const id = this.readers.length;
			this.readers.push(
				new EventReader(
					world.commands,
					eventType,
					eventsPointer,
					world.resources.length,
					id,
				),
			);
			this.writers.push(
				new EventWriter(
					world.commands,
					eventType,
					eventsPointer,
					world.resources.length,
					id,
				),
			);
			eventsPointer += EventReader.size;
		}
	}

	getReaderOfType<T extends Struct>(
		eventType: T,
	): EventReader<InstanceType<T>> | null {
		return this.readers.find(reader => reader.type === eventType) ?? null;
	}
	getWriterOfType<T extends Struct>(
		eventType: T,
	): EventWriter<InstanceType<T>> | null {
		return this.writers.find(reader => reader.type === eventType) ?? null;
	}
}
