import { EventReader, EventWriter } from './EventQueues';
import { Struct } from '../struct';
import { EventRegistryKey } from './EventRegistryKey';
import { Store } from '../storage';
import type { World } from '../world';

/**
 * A resource responsible for creating & holding all event queues in a world.
 */
export class Events {
	readers: EventReader<any>[] = [];
	writers: EventWriter<any>[] = [];

	static fromWorld(world: World) {
		return new this(world);
	}
	constructor({ registry, commands }: World) {
		// SAFETY: We know this is non-null, as the EventsRes only gets added
		// if an event queue has been registered!
		const eventTypes = registry.get(EventRegistryKey)! as Set<Struct>;
		for (const type of eventTypes) {
			const queueId = this.readers.length;
			const store = new Store(0);
			this.readers.push(new EventReader(commands, type, store, queueId));
			this.writers.push(new EventWriter(commands, type, store, queueId));
		}
	}

	getReaderOfType<T extends Struct>(
		eventType: T,
	): EventReader<InstanceType<T>> | undefined {
		return this.readers.find(reader => reader.type === eventType);
	}
	getWriterOfType<T extends Struct>(
		eventType: T,
	): EventWriter<InstanceType<T>> | undefined {
		return this.writers.find(writer => writer.type === eventType);
	}
}
