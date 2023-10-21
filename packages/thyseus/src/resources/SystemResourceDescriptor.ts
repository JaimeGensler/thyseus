import type { Class } from '../components';
import type { SystemParameter } from '../systems';
import type { World } from '../world';

export class SystemResourceDescriptor implements SystemParameter {
	resourceType: Class;

	constructor(resource: Class) {
		this.resourceType = resource;
	}

	async intoArgument(world: World): Promise<object> {
		const { resourceType } = this;
		return 'fromWorld' in resourceType
			? await (resourceType as any).fromWorld(world)
			: new resourceType();
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;

	class A {}

	describe('intoArgument', () => {
		const world: World = {
			threads: {
				queue: (create: any) => create(),
				isMainThread: true,
			},
		} as any;

		it("returns the instance of the descriptor's ResourceType", async () => {
			expect(
				await new SystemResourceDescriptor(A).intoArgument(world),
			).toBeInstanceOf(A);
		});

		it('uses fromWorld', async () => {
			const fromWorldSpy = vi.fn(() => new MyResource());
			class MyResource {
				static fromWorld = fromWorldSpy;
			}
			expect(
				await new SystemResourceDescriptor(MyResource).intoArgument(
					world,
				),
			).toBeInstanceOf(MyResource);
			expect(fromWorldSpy).toHaveBeenCalled();
		});
	});
}
