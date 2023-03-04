import { DEV } from 'esm-env';
import { assert } from '../utils/assert';
import { memory } from '../utils/memory';
import type { Struct } from '../struct';

let byteOffset = 0;

export function initStruct(instance: object): void {
	if (DEV) {
		assert(
			memory.isInitialized, // Structs require memory to be initialized.
			'Tried to create a struct before memory was initialized.',
		);
	}
	if ((instance as any).__$$b) {
		return; // We already initialized this struct, likely in the super() call.
	}
	//@ts-ignore
	(instance as any).__$$b =
		byteOffset !== 0
			? byteOffset // Managed Struct
			: memory.alloc((instance.constructor as Struct).size!); // Unmanaged Struct
}
export function dropStruct(instance: object): void {
	const structType = instance.constructor as Struct;
	const byteOffset = (instance as any).__$$b;
	for (const pointer of structType.pointers ?? []) {
		memory.free(memory.views.u32[(byteOffset + pointer) >> 2]);
	}
	memory.free(byteOffset);
}

export function createManagedStruct<T extends Struct>(
	type: T,
	pointer: number,
): InstanceType<T> {
	byteOffset = pointer;
	const instance = new type();
	byteOffset = 0;
	return instance as InstanceType<T>;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = import.meta.vitest;
	const { struct } = await import('../struct');

	beforeEach(() => {
		memory.init(10_000);
		return () => memory.UNSAFE_CLEAR_ALL();
	});

	describe('initStruct', () => {
		it('allocates space for one struct', () => {
			const allocSpy = vi.spyOn(memory, 'alloc');
			class MyComponent {
				static size = 15;
				constructor() {
					initStruct(this);
				}
			}
			expect(allocSpy).not.toHaveBeenCalled();
			new MyComponent();
			expect(allocSpy).toHaveBeenCalledOnce();
			expect(allocSpy).toHaveBeenCalledWith(15);

			MyComponent.size = 10;
			new MyComponent();
			expect(allocSpy).toHaveBeenCalledTimes(2);
			expect(allocSpy).toHaveBeenCalledWith(10);
		});

		it('does not alloc if byteOffset is already set', () => {
			const allocSpy = vi.spyOn(memory, 'alloc');
			class Parent {
				static size = 15;
				constructor() {
					initStruct(this);
				}
			}
			class Child extends Parent {
				static size = 10;
				constructor() {
					super();
					initStruct(this);
				}
			}
			expect(allocSpy).not.toHaveBeenCalled();
			new Child();
			expect(allocSpy).toHaveBeenCalledOnce();
		});
	});

	describe('createManagedStruct', () => {
		it('creates an instance of a struct without allocating', () => {
			class MyComponent {
				static size = 7;
				declare __$$b: number;
				constructor() {
					initStruct(this);
				}
			}
			const pointer = memory.alloc(MyComponent.size);
			const allocSpy = vi.spyOn(memory, 'alloc');
			expect(allocSpy).not.toHaveBeenCalled();

			const instance = createManagedStruct(MyComponent, pointer);
			expect(instance).toBeInstanceOf(MyComponent);
			expect(allocSpy).not.toHaveBeenCalled();
			expect(instance.__$$b).toBe(pointer);

			new MyComponent();
			expect(allocSpy).toHaveBeenCalledOnce();
			expect(allocSpy).toHaveBeenCalledWith(7);
		});
	});

	describe('dropStruct', () => {
		it('drops plain structs', () => {
			const freeSpy = vi.spyOn(memory, 'free');
			class StringComp {
				static size = 8;
				constructor() {
					initStruct(this);
				}
			}
			dropStruct(new StringComp());
			expect(freeSpy).toHaveBeenCalledOnce();
		});
		it('dropStruct drops pointers', () => {
			const freeSpy = vi.spyOn(memory, 'free');
			@struct
			class StringComp {
				declare __$$b: number;
				@struct.string declare val: string;
			}

			const comp = new StringComp();
			comp.val = 'test!';
			expect(comp.val).toBe('test!');
			const stringPointer = memory.views.u32[(comp.__$$b + 8) >> 2];
			const instancePointer = comp.__$$b;
			expect(freeSpy).not.toHaveBeenCalled();
			dropStruct(comp);
			expect(freeSpy).toHaveBeenCalledTimes(2);
			expect(freeSpy).toHaveBeenCalledWith(stringPointer);
			expect(freeSpy).toHaveBeenLastCalledWith(instancePointer);
		});
	});
}
