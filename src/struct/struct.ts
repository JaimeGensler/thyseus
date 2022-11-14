import { ComponentStore } from '../Components';
import { Class } from './types';
import { resetFields, TYPE_IDS } from './addField';
import {
	u8,
	u16,
	u32,
	u64,
	i8,
	i16,
	i32,
	i64,
	f32,
	f64,
	bool,
} from './primitives';
import { string } from './string';
import { array } from './array';
import { component } from './component';
import { StructDecorator } from './types';

export const struct: StructDecorator = () => {
	return function structDecorator(targetClass: Class): any {
		const { schema, size, alignment } = resetFields();
		return class extends targetClass {
			static schema = schema | ((targetClass as any).schema ?? 0);
			static size = size;
			static alignment = alignment;

			__$$s: ComponentStore;
			__$$b: number;
			#index: number;
			get __$$i() {
				return this.#index;
			}
			set __$$i(value: number) {
				this.#index = value;
				this.__$$b = value * (this.constructor as any).size;
			}

			constructor(store: ComponentStore, index: number) {
				super();
				this.__$$s = store;
				this.#index = index;
				this.__$$b = index * (this.constructor as any).size;
			}
		};
	};
};
struct.bool = bool;
struct.u8 = u8;
struct.u16 = u16;
struct.u32 = u32;
struct.u64 = u64;
struct.i8 = i8;
struct.i16 = i16;
struct.i32 = i32;
struct.i64 = i64;
struct.f32 = f32;
struct.f64 = f64;

struct.string = string;
struct.array = array;
struct.component = component;

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	@struct()
	class Vec3 {
		declare static schema: number;
		declare __$$i: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: ComponentStore, index: number) {}
	}

	it('adds a schema, size, and alignment to decorated classes', () => {
		@struct()
		class CompA {}

		@struct()
		class CompB {
			@struct.i32() declare myField: number;
		}

		@struct()
		class CompC {
			@struct.u8() declare myField: number;
			@struct.u16() declare myField2: number;
			@struct.f64() declare myField3: number;
		}

		expect(CompA).toHaveProperty('schema', 0);
		expect(CompA).toHaveProperty('size', 0);
		expect(CompA).toHaveProperty('alignment', 1);

		expect(CompB).toHaveProperty('schema', TYPE_IDS.i32);
		expect(CompB).toHaveProperty('size', 4);
		expect(CompB).toHaveProperty('alignment', 4);

		expect(CompC).toHaveProperty(
			'schema',
			TYPE_IDS.u8 | TYPE_IDS.u16 | TYPE_IDS.f64,
		);
		expect(CompC).toHaveProperty('size', 16);
		expect(CompC).toHaveProperty('alignment', 8);
	});

	it('creates a getter/setter around fields', () => {
		expect(Vec3).toHaveProperty('schema', TYPE_IDS.f64);

		const buffer = new ArrayBuffer(2 * 8 * 3);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f64: new Float64Array(buffer),
		};
		store.f64[0] = 1;
		store.f64[1] = 2;
		store.f64[2] = 3;

		const vec = new Vec3(store, 0);

		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);

		vec.x = Math.PI;
		expect(vec.x).toBe(Math.PI);

		vec.__$$i = 1;

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
			[struct.bool, 'u8', Uint8Array, false, true],
			[struct.u8, 'u8', Uint8Array, 0, 1],
			[struct.u16, 'u16', Uint16Array, 0, 65_535],
			[struct.u32, 'u32', Uint32Array, 0, 1_000_000],
			[struct.u64, 'u64', BigUint64Array, 0n, 1_123_000_000n],
			[struct.i8, 'i8', Int8Array, 0, -100],
			[struct.i16, 'i16', Int16Array, 0, -16_000],
			[struct.i32, 'i32', Int32Array, 0, 32],
			[struct.i64, 'i64', BigInt64Array, 0n, -1_000_000_000n],
			[struct.f32, 'f32', Float32Array, 0, 15],
			[struct.f64, 'f64', Float64Array, 0, Math.PI],
		] as const;

		for (const [
			decorator,
			schemaField,
			FieldConstructor,
			init,
			val,
		] of fields) {
			@struct()
			class Comp {
				declare __$$i: number;
				declare static schema: number;
				@decorator() declare field: any;
				constructor(store: ComponentStore, index: number) {}
			}

			expect(Comp.schema).toBe(TYPE_IDS[schemaField]);

			const buffer = new ArrayBuffer(
				FieldConstructor.BYTES_PER_ELEMENT * 2,
			);
			const store = {
				buffer,
				u8: new Uint8Array(buffer),
				[schemaField]: new FieldConstructor(buffer),
			};

			const comp = new Comp(store, 0);
			expect(comp.field).toBe(init);
			comp.field = val;
			expect(comp.field).toBe(val);
			comp.__$$i = 1;
			expect(comp.field).toBe(init);
		}
	});

	it('works for string fields', () => {
		@struct()
		class Comp {
			declare static schema: number;
			@struct.string({ characterCount: 5 }) declare value: string;
			@struct.string({ byteLength: 1 }) declare value2: string;
			constructor(store: ComponentStore, index: number) {}
		}

		const buffer = new ArrayBuffer(17);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
		};

		const comp = new Comp(store, 0);
		expect(comp.value).toBe('');

		comp.value = 'hello';
		expect(comp.value).toBe('hello');

		comp.value = 'bye';
		expect(comp.value).toBe('bye');

		comp.value += '!!!';
		expect(comp.value).toBe('bye!!!');

		expect(comp.value2).toBe('');
		comp.value2 = 'A';
		expect(comp.value2).toBe('A');
		comp.value2 = 'AA';
		expect(comp.value2).toBe('A');
	});

	it('works for arrays', () => {
		@struct()
		class Comp {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.array('u8', 8) declare value: Uint8Array;
			@struct.array('f64', 3) declare value2: Float64Array;
			constructor(store: ComponentStore, index: number) {}
		}
		const buffer = new ArrayBuffer(Comp.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f64: new Float64Array(buffer),
		};
		const comp = new Comp(store, 0);
		expect(comp.value).toBeInstanceOf(Uint8Array);
		expect(comp.value2).toBeInstanceOf(Float64Array);

		comp.value = new Uint8Array(8).fill(3);
		comp.value2 = new Float64Array(3).fill(Math.PI);
		expect(comp.value).toStrictEqual(new Uint8Array(8).fill(3));
		expect(comp.value2).toStrictEqual(new Float64Array(3).fill(Math.PI));
		comp.__$$i = 1;

		expect(comp.value).toStrictEqual(new Uint8Array(8));
		expect(comp.value2).toStrictEqual(new Float64Array(3));
	});

	it('reorders fields as necessary', () => {
		@struct()
		class Comp {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.u8() declare a: number;
			@struct.u64() declare b: bigint;
			@struct.i16() declare c: number;
			@struct.f32() declare d: number;
			constructor(store: ComponentStore, index: number) {}
		}
		const buffer = new ArrayBuffer(Comp.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			u64: new BigUint64Array(buffer),
			i16: new Int16Array(buffer),
			f32: new Float32Array(buffer),
		};
		const comp = new Comp(store, 0);
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

	it('works for components', () => {
		@struct()
		class Transform {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.component(Vec3) declare position: Vec3;
			@struct.f32() declare scale: number;
			@struct.component(Vec3) declare rotation: Vec3;
			constructor(store: ComponentStore, index: number) {}
		}

		const buffer = new ArrayBuffer(Transform.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f32: new Float32Array(buffer),
			f64: new Float64Array(buffer),
		};
		const transform = new Transform(store, 0);
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
}
