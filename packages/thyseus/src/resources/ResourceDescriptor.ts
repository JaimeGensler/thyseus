import { ReadModifier } from '../queries';
import type { Class, Struct } from '../components';
import type { SystemParameter } from '../systems';
import type { World } from '../world';

export class ResourceDescriptor implements SystemParameter {
	resourceType: Class;
	isReadonly: boolean;

	constructor(resource: Struct | ReadModifier) {
		const isReadonly = resource instanceof ReadModifier;
		this.resourceType = isReadonly ? resource.value : resource;
		this.isReadonly = isReadonly;
	}

	async intoArgument(world: World): Promise<object> {
		return world.getOrCreateResource(this.resourceType);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;
	const { World } = await import('../world');

	class A {}
	class B {}
	class C {
		static size = 0;
		static alignment = 1;
	}

	describe('intoArgument', () => {
		it('returns the instance of the Resource type', async () => {
			const world = await World.new().build();
			expect(
				await new ResourceDescriptor(A).intoArgument(world),
			).toBeInstanceOf(A);
			expect(
				await new ResourceDescriptor(C).intoArgument(world),
			).toBeInstanceOf(C);
		});
	});
}
