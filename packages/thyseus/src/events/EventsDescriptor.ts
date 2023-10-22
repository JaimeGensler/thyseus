import type { Class } from '../components';
import type { World } from '../world';
import type { SystemParameter } from '../systems';

import { Events } from './Events';
import type { EventReader, EventWriter } from './EventQueues';

export class EventReaderDescriptor implements SystemParameter {
	eventType: Class;
	constructor(eventType: Class) {
		this.eventType = eventType;
	}
	async intoArgument(world: World): Promise<EventReader<object>> {
		return (await world.getOrCreateResource(Events)).getReaderOfType(
			this.eventType,
		)!;
	}
}
export class EventWriterDescriptor extends EventReaderDescriptor {
	async intoArgument(world: World): Promise<EventWriter<object>> {
		return (await world.getOrCreateResource(Events)).getWriterOfType(
			this.eventType,
		)!;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;
	const { EventReader, EventWriter } = await import('./EventQueues');
	const { World } = await import('../world');

	class A {}
	class B {}

	describe('intoArgument', () => {
		it('returns an event reader/writer', async () => {
			const world = await World.new().build();
			const rdResult = await new EventReaderDescriptor(A).intoArgument(
				world,
			);
			const wrResult = await new EventWriterDescriptor(B).intoArgument(
				world,
			);
			expect(rdResult).toBeInstanceOf(EventReader);
			expect(rdResult.type).toBe(A);
			expect(wrResult).toBeInstanceOf(EventWriter);
			expect(wrResult.type).toBe(B);
		});
	});
}
