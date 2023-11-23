import { ReadModifier } from '../queries';
import { isStruct, type Class, Struct } from '../struct';
import type { SystemParameter } from '../systems';
import type { World, WorldBuilder } from '../world';

export class ResourceDescriptor implements SystemParameter {
	resourceType: Class;
	isReadonly: boolean;

	constructor(resource: Struct | ReadModifier) {
		const isReadonly = resource instanceof ReadModifier;
		this.resourceType = isReadonly ? resource.value : resource;
		this.isReadonly = isReadonly;
	}

	isLocalToThread(): boolean {
		return !isStruct(this.resourceType);
	}

	intersectsWith(other: unknown): boolean {
		return other instanceof ResourceDescriptor
			? this.resourceType === other.resourceType &&
					(this.isReadonly || other.isReadonly)
			: false;
	}

	onAddSystem(builder: WorldBuilder): void {
		builder.registerResource(this.resourceType);
	}

	intoArgument(world: World): object {
		return world.getResource(this.resourceType) as any;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;

	class A {}
	class B {}
	class C {
		static size = 0;
		static alignment = 1;
	}

	describe('intersectsWith', () => {
		it('returns false for resources that are not identical', () => {
			const resA = new ResourceDescriptor(A);
			const resB = new ResourceDescriptor(B);
			expect(resA.intersectsWith(resB)).toBe(false);
		});

		it('returns false for resources that are both readonly', () => {
			const res1 = new ResourceDescriptor(A);
			const res2 = new ResourceDescriptor(A);

			expect(res1.intersectsWith(res2)).toBe(false);
		});

		it('returns true for resources that read/write overlap', () => {
			const res1 = new ResourceDescriptor(A);
			const res2 = new ResourceDescriptor(A);
			const res3 = new ResourceDescriptor(A);

			expect(res1.intersectsWith(res2)).toBe(true);
			expect(res2.intersectsWith(res3)).toBe(true);
		});

		it('does not intersect with non-ResourceDescriptors', () => {
			expect(new ResourceDescriptor(A).intersectsWith({})).toBe(false);
		});
	});

	describe('onAddSystem', () => {
		const getBuilder = (): WorldBuilder =>
			({
				registerResource: vi.fn(),
				registerSendableClass: vi.fn(),
			} as any);

		it('registers resources', () => {
			const builder = getBuilder();
			new ResourceDescriptor(A).onAddSystem(builder);
			expect(builder.registerResource).toHaveBeenCalledTimes(1);
			expect(builder.registerResource).toHaveBeenCalledWith(A);
			new ResourceDescriptor(B).onAddSystem(builder);
			expect(builder.registerResource).toHaveBeenCalledWith(B);
		});
	});

	describe('isLocalToThread', () => {
		it('returns true if resource does not have struct static fields', () => {
			expect(new ResourceDescriptor(A).isLocalToThread()).toBe(true);
			expect(new ResourceDescriptor(B).isLocalToThread()).toBe(true);
		});
		it('returns false if resource has struct static fields', () => {
			expect(new ResourceDescriptor(C).isLocalToThread()).toBe(false);
			expect(new ResourceDescriptor(C).isLocalToThread()).toBe(false);
		});
	});

	describe('intoArgument', () => {
		it('returns the instance of the Resource type', () => {
			const world = {
				resources: [new A(), new C()],
				getResource(type: any) {
					return this.resources.find(
						(t: any) => t.constructor === type,
					);
				},
				threads: { isMainThread: true },
			} as any;

			expect(
				new ResourceDescriptor(A).intoArgument(world),
			).toBeInstanceOf(A);
			expect(
				new ResourceDescriptor(C).intoArgument(world),
			).toBeInstanceOf(C);
		});
	});
}
