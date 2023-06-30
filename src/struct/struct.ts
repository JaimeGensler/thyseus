type Copy = any;
type Drop = any;
export type Class = {
	new (...args: any[]): object;
};
export type Struct = {
	// NOTE: Types are loosened to optional here as the transformer generates
	// these fields. `size` and `alignment` are required, copy and drop are not

	/**
	 * The alignment of this type.
	 * Equal to the number of bytes of the largest primitive type this struct contains (1, 2, 4, or 8).
	 */
	alignment?: number;

	/**
	 * The size of this struct, including padding.
	 * May be `0`.
	 * Always a multiple of alignment.
	 */
	size?: number;

	/**
	 * A function that creates a **deep** copy given an instance of a struct.
	 */
	copy?: Copy;

	/**
	 * A function that fully drops an instance of a struct.
	 */
	drop?: Drop;

	new (): object;
};

export function struct(targetClass: Class): void;
export function struct(
	targetClass: Class,
	context: ClassDecoratorContext,
): void;
export function struct(): any {}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;
	const { Memory } = await import('../utils');

	beforeEach(() => {
		Memory.init(10_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	@struct
	class Vec3 {
		declare static size: number;
		declare __$$b: number;
		@struct.f64 declare x: number;
		@struct.f64 declare y: number;
		@struct.f64 declare z: number;
	}

	it('adds size, alignment to decorated classes', () => {
		@struct
		class CompA {}

		@struct
		class CompB {
			@struct.i32 declare myField: number;
		}

		@struct
		class CompC {
			@struct.u8 declare myField: number;
			@struct.u16 declare myField2: number;
			@struct.f64 declare myField3: number;
		}

		expect(CompA).toHaveProperty('size', 0);
		expect(CompA).toHaveProperty('alignment', 1);

		expect(CompB).toHaveProperty('size', 4);
		expect(CompB).toHaveProperty('alignment', 4);

		expect(CompC).toHaveProperty('size', 16);
		expect(CompC).toHaveProperty('alignment', 8);
	});

	it('creates a getter/setter around fields', () => {
		const vec = new Vec3();
		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);

		vec.x = 1;
		vec.y = 2;
		vec.z = 3;
		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);

		vec.x = Math.PI;
		expect(vec.x).toBe(Math.PI);

		vec.__$$b = Memory.alloc(Vec3.size!);
		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);

		vec.y = 8;
		expect(vec.x).toBe(0);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(0);
	});

	it('works with every primitive decorators', () => {
		const fields = [
			[struct.bool, false, true],
			[struct.u8, 0, 1],
			[struct.u16, 0, 65_535],
			[struct.u32, 0, 1_000_000],
			[struct.u64, 0n, 1_123_000_000n],
			[struct.i8, 0, -100],
			[struct.i16, 0, -16_000],
			[struct.i32, 0, 32],
			[struct.i64, 0n, -1_000_000_000n],
			[struct.f32, 0, 15],
			[struct.f64, 0, Math.PI],
		] as const;

		for (const [decorator, init, val] of fields) {
			@struct
			class Comp {
				declare __$$b: number;
				declare static size: number;
				@decorator declare field: any;
			}

			const comp = new Comp();
			expect(comp.field).toBe(init);
			comp.field = val;
			expect(comp.field).toBe(val);
			comp.__$$b = Memory.alloc(Comp.size!);
			expect(comp.field).toBe(init);
		}
	});

	it('works for string fields', () => {
		@struct
		class Comp {
			@struct.string declare value: string;
		}
		const comp = new Comp();
		expect(comp.value).toBe('');

		comp.value = 'hello';
		expect(comp.value).toBe('hello');

		comp.value = 'bye';
		expect(comp.value).toBe('bye');

		comp.value += '!!!';
		expect(comp.value).toBe('bye!!!');
	});

	it('works for arrays', () => {
		@struct
		class Comp {
			declare static size: number;
			declare __$$b: number;
			@struct.array({ type: 'u8', length: 8 }) declare value: Uint8Array;
			@struct.array({ type: 'f64', length: 3 })
			declare value2: Float64Array;
		}
		const comp = new Comp();

		expect(comp.value).toBeInstanceOf(Uint8Array);
		expect(comp.value2).toBeInstanceOf(Float64Array);

		comp.value = new Uint8Array(8).fill(3);
		comp.value2 = new Float64Array(3).fill(Math.PI);
		expect(comp.value).toStrictEqual(new Uint8Array(8).fill(3));
		expect(comp.value2).toStrictEqual(new Float64Array(3).fill(Math.PI));
		comp.__$$b = Memory.alloc(Comp.size!);

		expect(comp.value).toStrictEqual(new Uint8Array(8));
		expect(comp.value2).toStrictEqual(new Float64Array(3));
	});

	it('reorders fields as necessary', () => {
		@struct
		class Comp {
			declare static size: number;
			declare __$$b: number;
			@struct.u8 declare a: number;
			@struct.u64 declare b: bigint;
			@struct.i16 declare c: number;
			@struct.f32 declare d: number;
		}
		const comp = new Comp();
		expect(comp.a).toBe(0);
		expect(comp.b).toBe(0n);
		expect(comp.c).toBe(0);
		expect(comp.d).toBe(0);

		comp.a = 128;
		comp.b = 0xfffffff0n;
		comp.c = -13;
		comp.d = 1.5;

		expect(comp.a).toBe(128);
		expect(comp.b).toBe(0xfffffff0n);
		expect(comp.c).toBe(-13);
		expect(comp.d).toBe(1.5);
	});

	it('works for substructs', () => {
		@struct
		class Transform {
			declare static size: number;

			declare __$$b: number;
			@struct.substruct(Vec3) declare position: Vec3;
			@struct.f32 declare scale: number;
			@struct.substruct(Vec3) declare rotation: Vec3;
		}

		const transform = new Transform();
		expect(transform.position.x).toBe(0);
		expect(transform.position.y).toBe(0);
		expect(transform.position.z).toBe(0);
		expect(transform.rotation.x).toBe(0);
		expect(transform.rotation.z).toBe(0);
		expect(transform.rotation.z).toBe(0);
		expect(transform.scale).toBe(0);

		transform.position.x = 1.5;
		transform.position.y = 2.5;
		transform.position.z = 3.5;
		transform.rotation.x = 4.5;
		transform.rotation.y = 5.5;
		transform.rotation.z = 6.5;
		transform.scale = 7.5;

		expect(transform.position.x).toBe(1.5);
		expect(transform.position.y).toBe(2.5);
		expect(transform.position.z).toBe(3.5);
		expect(transform.rotation.x).toBe(4.5);
		expect(transform.rotation.y).toBe(5.5);
		expect(transform.rotation.z).toBe(6.5);
		expect(transform.scale).toBe(7.5);
	});

	it('works for substructs with constructors', () => {
		@struct
		class Child {
			@struct.u32 declare value: number;
			constructor(val = 0) {
				initStruct(this);
				this.value = 0;
			}
		}

		@struct
		class Parent {
			declare static size: number;

			declare __$$b: number;
			@struct.substruct(Child) declare child: Child;
		}

		const parent = new Parent();
		expect(parent.child.value).toBe(0);
		parent.child.value = 1;
		expect(parent.child.value).toBe(1);
	});
}
