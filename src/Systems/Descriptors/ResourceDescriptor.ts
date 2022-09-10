import { isSendableClass } from '../../utils/Thread';
import AccessType from '../../utils/AccessType';
import Mut, { type Mutable } from '../Mut';
import type WorldBuilder from '../../World/WorldBuilder';
import type Descriptor from './Descriptor';
import type { Class } from '../../utilTypes';
import type { ResourceType } from '../../Resources/Resource';
import type World from '../../World';

export default class ResourceDescriptor<
	T extends ResourceType | Mutable<ResourceType>,
> implements Descriptor
{
	resource: ResourceType;
	accessType: AccessType;

	constructor(resource: T) {
		const isMut = Mut.isMut<ResourceType>(resource);
		this.resource = isMut ? resource[0] : resource;
		this.accessType = isMut ? AccessType.Write : AccessType.Read;
	}

	isLocalToThread() {
		return !isSendableClass(this.resource);
	}

	intersectsWith(other: unknown): boolean {
		return other instanceof ResourceDescriptor
			? this.resource === other.resource &&
					(this.accessType === AccessType.Write ||
						other.accessType === AccessType.Write)
			: false;
	}

	onAddSystem(builder: WorldBuilder) {
		builder.registerResource(this.resource);
		if (isSendableClass(this.resource)) {
			builder.registerSendableClass(this.resource);
		}
	}

	intoArgument(
		world: World,
	): T extends Mutable<infer X>
		? InstanceType<X>
		: Readonly<InstanceType<T extends Class ? T : never>> {
		return world.resources.get(this.resource) as any;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { ThreadProtocol } = await import('../../utils/Thread');

	class A {}
	class B {}
	class C {
		[ThreadProtocol.Send]() {}
		static [ThreadProtocol.Receive]() {}
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
			const res2 = new ResourceDescriptor(Mut(A));
			const res3 = new ResourceDescriptor(Mut(A));

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
			new ResourceDescriptor(Mut(B)).onAddSystem(builder);
			expect(builder.registerResource).toHaveBeenCalledWith(B);

			expect(builder.registerSendableClass).not.toHaveBeenCalled();
		});

		it('registers sendable classes for shared resources', () => {
			const builder = getBuilder();
			new ResourceDescriptor(C).onAddSystem(builder);
			expect(builder.registerResource).toHaveBeenCalledTimes(1);
			expect(builder.registerResource).toHaveBeenCalledWith(C);
			expect(builder.registerSendableClass).toHaveBeenCalledTimes(1);
			expect(builder.registerSendableClass).toHaveBeenCalledWith(C);
		});
	});

	describe('isLocalToThread', () => {
		it('returns true if resource does NOT implement Thread Send/Receive', () => {
			expect(new ResourceDescriptor(A).isLocalToThread()).toBe(true);
			expect(new ResourceDescriptor(Mut(B)).isLocalToThread()).toBe(true);
		});
		it('returns false if resource impls Thread Send/Receive', () => {
			expect(new ResourceDescriptor(C).isLocalToThread()).toBe(false);
			expect(new ResourceDescriptor(Mut(C)).isLocalToThread()).toBe(
				false,
			);
		});
	});

	describe('intoArgument', () => {
		it("returns the instance of the descriptor's ResourceType", () => {
			const resources = new Map().set(A, new A()).set(C, new C());
			expect(
				new ResourceDescriptor(A).intoArgument({ resources } as any),
			).toBeInstanceOf(A);
			expect(
				new ResourceDescriptor(Mut(C)).intoArgument({
					resources,
				} as any),
			).toBeInstanceOf(C);
		});
	});
}
