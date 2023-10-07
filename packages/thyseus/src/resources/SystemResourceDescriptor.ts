import { isStruct, type Class } from '../struct';
import type { SystemParameter } from '../systems';
import type { World, WorldBuilder } from '../world';

export class SystemResourceDescriptor implements SystemParameter {
	resourceType: Class;

	constructor(resource: Class) {
		this.resourceType = resource;
	}

	isLocalToThread(): boolean {
		return !isStruct(this.resourceType);
	}
	intersectsWith(other: unknown): boolean {
		return false;
	}

	onAddSystem(builder: WorldBuilder): void {}

	async intoArgument(world: World): Promise<object> {
		const { resourceType } = this;
		return (resourceType as any).fromWorld
			? (resourceType as any).fromWorld(world)
			: new resourceType();
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;

	class A {}
	class C {
		static size = 1;
		static alignment = 1;
	}

	describe('intersectsWith', () => {
		it('returns false', () => {
			const resA = new SystemResourceDescriptor(A);
			const resA2 = new SystemResourceDescriptor(A);
			expect(resA.intersectsWith(resA2)).toBe(false);
		});
	});

	describe('onAddSystem', () => {
		it('is a no-op', () => {
			const builder = {
				registerResource: vi.fn(),
				registerSendableClass: vi.fn(),
			} as any;
			new SystemResourceDescriptor(A).onAddSystem(builder);
			expect(builder.registerResource).not.toHaveBeenCalled();
		});
	});

	describe('isLocalToThread', () => {
		it('returns true if resource is not a struct', () => {
			expect(new SystemResourceDescriptor(A).isLocalToThread()).toBe(
				true,
			);
		});
		it('returns false if resource has struct static fields', () => {
			expect(new SystemResourceDescriptor(C).isLocalToThread()).toBe(
				false,
			);
		});
	});

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
