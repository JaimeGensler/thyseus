import type { World, WorldBuilder } from '../world';
import type { SystemParameter } from '../systems';
import type { Struct, StructInstance } from '../struct';

import { Events } from './Events';
import type { EventReader, EventWriter } from './EventQueues';
import { ClearEventQueueCommand } from './ClearEventQueueCommand';

export class EventReaderDescriptor implements SystemParameter {
	eventType: Struct;
	constructor(eventType: Struct) {
		this.eventType = eventType;
	}
	isLocalToThread(): boolean {
		return false;
	}
	intersectsWith(other: unknown): boolean {
		if (other instanceof EventWriterDescriptor) {
			return this.eventType === other.eventType;
		} else if (other instanceof EventReaderDescriptor) {
			return (
				this instanceof EventWriterDescriptor &&
				this.eventType === other.eventType
			);
		}
		return false;
	}
	onAddSystem(builder: WorldBuilder): void {
		builder
			.registerResource(Events)
			.registerCommand(ClearEventQueueCommand)
			.register(Events.key, this.eventType);
	}
	intoArgument(world: World): EventReader<StructInstance> {
		return world.getResource(Events).getReaderOfType(this.eventType)!;
	}
}
export class EventWriterDescriptor extends EventReaderDescriptor {
	intoArgument(world: World): EventWriter<StructInstance> {
		return world.getResource(Events).getWriterOfType(this.eventType)!;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { EventReader, EventWriter } = await import('./EventQueues');
	const { Store } = await import('../storage');

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
				register: vi.fn(() => builder),
				registerResource: vi.fn(() => builder),
				registerCommand: vi.fn(() => builder),
			} as any;
			new EventReaderDescriptor(A).onAddSystem(builder);
			expect(builder.register).toHaveBeenCalledOnce();
			expect(builder.registerResource).toHaveBeenLastCalledWith(Events);
			expect(builder.register).toHaveBeenCalledWith(Events.key, A);
			expect(builder.registerCommand).toHaveBeenCalledWith(
				ClearEventQueueCommand,
			);
			new EventWriterDescriptor(B).onAddSystem(builder);
			expect(builder.register).toHaveBeenCalledTimes(2);
			expect(builder.register).toHaveBeenLastCalledWith(Events.key, B);
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
			const p1 = new Store(0);
			const p2 = new Store(0);
			const world = {
				getResource: () => ({
					eventReaders: [
						new EventReader(commands, A, p1, 0),
						new EventReader(commands, B, p1, 0),
					],
					eventWriters: [
						new EventWriter(commands, A, p2, 0),
						new EventWriter(commands, B, p2, 0),
					],
					getReaderOfType(type: any) {
						return this.eventReaders.find(
							reader => reader.type === type,
						);
					},
					getWriterOfType(type: any) {
						return this.eventWriters.find(
							reader => reader.type === type,
						);
					},
				}),
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
