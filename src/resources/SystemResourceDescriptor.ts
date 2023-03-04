import { memory } from '../utils/memory';
import { createManagedStruct } from '../storage/initStruct';
import { isStruct, type Class } from '../struct';
import type { Descriptor } from '../systems';
import type { World, WorldBuilder } from '../world';

export class SystemResourceDescriptor<T extends object> implements Descriptor {
	resourceType: Class;

	constructor(resource: { new (): T }) {
		this.resourceType = resource;
	}

	isLocalToThread(): boolean {
		return !isStruct(this.resourceType);
	}
	intersectsWith(other: unknown): boolean {
		return false;
	}

	onAddSystem(builder: WorldBuilder): void {}

	async intoArgument({ threads }: World): Promise<T> {
		const { resourceType } = this;
		const instance = isStruct(resourceType)
			? createManagedStruct(
					resourceType,
					resourceType.size! !== 0
						? threads.queue(() => memory.alloc(resourceType.size!))
						: 0,
			  )
			: new resourceType();
		if (threads.isMainThread) {
			await (instance as any).initialize?.();
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
				isMainThread: true,
			},
		} as any;

		it("returns the instance of the descriptor's ResourceType", async () => {
			const allocSpy = vi.spyOn(memory, 'alloc');
			expect(
				await new SystemResourceDescriptor(A).intoArgument(world),
			).toBeInstanceOf(A);
			expect(allocSpy).not.toHaveBeenCalled();
		});

		it('allocates a pointer if struct', async () => {
			memory.init(256);
			const allocSpy = vi.spyOn(memory, 'alloc');
			expect(
				await new SystemResourceDescriptor(C).intoArgument(world),
			).toBeInstanceOf(C);
			expect(allocSpy).toHaveBeenCalledOnce();
			expect(allocSpy).toHaveBeenCalledWith(1);
		});

		it('initializes resources', async () => {
			const initializeSpy = vi.fn();
			class MyResource {
				initialize = initializeSpy;
			}
			expect(
				await new SystemResourceDescriptor(MyResource).intoArgument(
					world,
				),
			).toBeInstanceOf(MyResource);
			expect(initializeSpy).toHaveBeenCalled();
		});
	});
}
