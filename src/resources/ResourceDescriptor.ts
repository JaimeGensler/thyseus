import { Mut } from '../queries';
import { isStruct, type Class } from '../struct';
import type { Descriptor } from '../systems';
import type { World, WorldBuilder } from '../world';

export class ResourceDescriptor<T extends Class | Mut<Class>>
	implements Descriptor
{
	resource: Class;
	canWrite: boolean;

	constructor(resource: T) {
		const isMut = resource instanceof Mut;
		this.resource = isMut ? resource.value : resource;
		this.canWrite = isMut;
	}

	isLocalToThread(): boolean {
		return !isStruct(this.resource);
	}

	intersectsWith(other: unknown): boolean {
		return other instanceof ResourceDescriptor
			? this.resource === other.resource &&
					(this.canWrite || other.canWrite)
			: false;
	}

	onAddSystem(builder: WorldBuilder): void {
		builder.registerResource(this.resource);
	}

	intoArgument(
		world: World,
	): T extends Mut<infer X>
		? X
		: Readonly<InstanceType<T extends Class ? T : never>> {
		return world.resources.find(
			res => res.constructor === this.resource,
		) as any;
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
			const res2 = new ResourceDescriptor(new Mut(A));
			const res3 = new ResourceDescriptor(new Mut(A));

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
			new ResourceDescriptor(new Mut(B)).onAddSystem(builder);
			expect(builder.registerResource).toHaveBeenCalledWith(B);
		});
	});

	describe('isLocalToThread', () => {
		it('returns true if resource does not have struct static fields', () => {
			expect(new ResourceDescriptor(A).isLocalToThread()).toBe(true);
			expect(new ResourceDescriptor(new Mut(B)).isLocalToThread()).toBe(
				true,
			);
		});
		it('returns false if resource has struct static fields', () => {
			expect(new ResourceDescriptor(C).isLocalToThread()).toBe(false);
			expect(new ResourceDescriptor(new Mut(C)).isLocalToThread()).toBe(
				false,
			);
		});
	});

	describe('intoArgument', () => {
		it('returns the instance of the Resource type', () => {
			const resources = [new A(), new C()];
			expect(
				new ResourceDescriptor(A).intoArgument({ resources } as any),
			).toBeInstanceOf(A);
			expect(
				new ResourceDescriptor(new Mut(C)).intoArgument({
					resources,
				} as any),
			).toBeInstanceOf(C);
		});
	});
}
