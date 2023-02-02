import { memory } from '../../utils/memory';
import { isStruct, type Class } from '../../struct';
import type { Descriptor } from './Descriptor';
import type { World, WorldBuilder } from '../../world';

export class SystemResourceDescriptor<T extends object> implements Descriptor {
	resource: Class;

	constructor(resource: { new (): T }) {
		this.resource = resource;
	}

	isLocalToThread() {
		return !isStruct(this.resource);
	}
	intersectsWith(other: unknown) {
		return false;
	}

	onAddSystem(builder: WorldBuilder) {}

	intoArgument(world: World): T {
		const { resource } = this;
		const instance = new resource();
		if (isStruct(resource)) {
			(instance as any).__$$s = memory.views;
			(instance as any).__$$b = world.threads.queue(() =>
				memory.alloc(resource.size!),
			);
		}
		return instance as T;
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
			},
		} as any;

		it("returns the instance of the descriptor's ResourceType", () => {
			const allocSpy = vi.spyOn(memory, 'alloc');
			expect(
				new SystemResourceDescriptor(A).intoArgument(world),
			).toBeInstanceOf(A);
			expect(allocSpy).not.toHaveBeenCalled();
		});

		it('allocates a pointer if struct', () => {
			memory.init(256);
			const allocSpy = vi.spyOn(memory, 'alloc');
			expect(
				new SystemResourceDescriptor(C).intoArgument(world),
			).toBeInstanceOf(C);
			expect(allocSpy).toHaveBeenCalledOnce();
			expect(allocSpy).toHaveBeenCalledWith(1);
		});
	});
}
