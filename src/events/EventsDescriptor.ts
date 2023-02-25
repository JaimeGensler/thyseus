import type { EventReader, EventWriter } from './Events';
import type { World, WorldBuilder } from '../world';
import type { Descriptor } from '../systems';
import type { Struct } from '../struct';

export class EventReaderDescriptor<T extends Struct> implements Descriptor {
	eventType: Struct;
	constructor(eventType: T) {
		this.eventType = eventType;
	}
	isLocalToThread(): boolean {
		return false;
	}
	intersectsWith(other: unknown): boolean {
		return (
			other instanceof EventWriterDescriptor &&
			other.eventType === this.eventType
		);
	}
	onAddSystem(builder: WorldBuilder): void {
		builder.registerEvent(this.eventType);
	}
	intoArgument(world: World): EventReader<InstanceType<T>> {
		return world.eventReaders.find(rd => rd.type === this.eventType)!;
	}
}
export class EventWriterDescriptor<T extends Struct> implements Descriptor {
	eventType: Struct;
	constructor(eventType: T) {
		this.eventType = eventType;
	}
	isLocalToThread(): boolean {
		return false;
	}
	intersectsWith(other: unknown): boolean {
		return (
			(other instanceof EventWriterDescriptor ||
				other instanceof EventReaderDescriptor) &&
			other.eventType === this.eventType
		);
	}
	onAddSystem(builder: WorldBuilder): void {
		builder.registerEvent(this.eventType);
	}
	intoArgument(world: World): EventWriter<InstanceType<T>> {
		return world.eventWriters.find(wr => wr.type === this.eventType)!;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { EventReader, EventWriter } = await import('./Events');

	class A {}
	class B {}
	describe('intersectsWith', () => {
		it('returns true for EventWriters with the same intersection', () => {
			expect(
				new EventWriterDescriptor(A).intersectsWith(
					new EventWriterDescriptor(A),
				),
			).toBe(true);
			expect(
				new EventWriterDescriptor(A).intersectsWith(
					new EventWriterDescriptor(B),
				),
			).toBe(false);
		});

		it('returns false for EventReaders', () => {
			expect(
				new EventReaderDescriptor(A).intersectsWith(
					new EventReaderDescriptor(A),
				),
			).toBe(false);
			expect(
				new EventReaderDescriptor(A).intersectsWith(
					new EventReaderDescriptor(B),
				),
			).toBe(false);
		});

		it('returns true for Reader/Writer pairs for the same event', () => {
			expect(
				new EventReaderDescriptor(A).intersectsWith(
					new EventWriterDescriptor(A),
				),
			).toBe(true);
		});
	});

	describe('onAddSystem', () => {
		it('registers the events', () => {
			const builder: WorldBuilder = {
				registerEvent: vi.fn(),
			} as any;
			new EventReaderDescriptor(A).onAddSystem(builder);
			expect(builder.registerEvent).toHaveBeenCalledOnce();
			expect(builder.registerEvent).toHaveBeenCalledWith(A);
			new EventWriterDescriptor(B).onAddSystem(builder);
			expect(builder.registerEvent).toHaveBeenCalledTimes(2);
			expect(builder.registerEvent).toHaveBeenLastCalledWith(B);
		});
	});

	describe('isLocalToThread', () => {
		it('returns false', () => {
			expect(new EventReaderDescriptor(A).isLocalToThread()).toBe(false);
			expect(new EventWriterDescriptor(B).isLocalToThread()).toBe(false);
		});
	});

	describe('intoArgument', () => {
		it('returns an event reader/writer', () => {
			const commands = {} as any;
			const world = {
				eventReaders: [
					new EventReader(commands, A, 0),
					new EventReader(commands, B, 0),
				],
				eventWriters: [
					new EventWriter(commands, A, 0),
					new EventWriter(commands, B, 0),
				],
			} as any;
			const rdResult = new EventReaderDescriptor(A).intoArgument(world);
			const wrResult = new EventWriterDescriptor(B).intoArgument(world);
			expect(rdResult).toBeInstanceOf(EventReader);
			expect(rdResult.type).toBe(A);
			expect(wrResult).toBeInstanceOf(EventWriter);
			expect(wrResult.type).toBe(B);
		});
	});
}
