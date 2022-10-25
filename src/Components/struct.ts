import type { Class } from '../Resources';
import type { ComponentType, TypedArrayConstructor } from './types';

let schema: Record<string | symbol, any> = {};
let size = 0;

export function struct() {
	// TODO: Fix return type, if possible
	return function structDecorator(targetClass: Class): any {
		class StructClass extends targetClass {
			static schema = schema;
			static size = size;

			store: any;
			index: number;
			constructor(store: any, index: any) {
				super();
				this.store = store;
				this.index = index;
			}
		}
		schema = {};
		size = 0;
		return StructClass;
	};
}

function createFieldDecorator(FieldType: TypedArrayConstructor) {
	return function () {
		return function fieldDecorator(
			prototype: object,
			propertyKey: string | symbol,
		) {
			schema[propertyKey] = FieldType;
			size += FieldType.BYTES_PER_ELEMENT;
			Object.defineProperty(prototype, propertyKey, {
				enumerable: true,
				get(this: ComponentType) {
					//@ts-ignore
					return this.store[propertyKey][this.index];
				},
				set(value: number) {
					this.store[propertyKey][this.index] = value;
				},
			});
		};
	};
}

struct.bool = function () {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		schema[propertyKey] = Uint8Array;
		size += Uint8Array.BYTES_PER_ELEMENT;
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get(this: ComponentType) {
				//@ts-ignore
				return !!this.store[propertyKey][this.index];
			},
			set(value: boolean) {
				this.store[propertyKey][this.index] = Number(value);
			},
		});
	};
};
struct.u8 = createFieldDecorator(Uint8Array);
struct.u16 = createFieldDecorator(Uint16Array);
struct.u32 = createFieldDecorator(Uint32Array);
struct.u64 = createFieldDecorator(BigUint64Array);
struct.i8 = createFieldDecorator(Int8Array);
struct.i16 = createFieldDecorator(Int16Array);
struct.i32 = createFieldDecorator(Int32Array);
struct.i64 = createFieldDecorator(BigInt64Array);
struct.f32 = createFieldDecorator(Float32Array);
struct.f64 = createFieldDecorator(Float64Array);

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	it('adds a schema and size to decorated classes', () => {
		@struct()
		class CompA {}

		@struct()
		class CompB {
			@struct.i32() declare myField: number;
		}

		expect(CompA).toHaveProperty('schema', {});
		expect(CompA).toHaveProperty('size', 0);
		expect(CompB).toHaveProperty('schema', {
			myField: Int32Array,
		});
		expect(CompB).toHaveProperty('size', 4);

		//@ts-ignore
		expect(CompA.schema).not.toBe(CompB.schema);
	});

	it('creates a getter/setter around fields', () => {
		@struct()
		class Vec3 {
			@struct.f64() declare x: number;
			@struct.f64() declare y: number;
			@struct.f64() declare z: number;
		}
		expect(Vec3).toHaveProperty('schema', {
			x: Float64Array,
			y: Float64Array,
			z: Float64Array,
		});
		expect(Vec3).toHaveProperty('size', 24);

		const store = {
			x: new Float64Array(8),
			y: new Float64Array(8),
			z: new Float64Array(8),
		};
		store.x[0] = 1;
		store.y[0] = 2;
		store.z[0] = 3;

		//@ts-ignore
		const vec = new Vec3(store, 0);

		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);

		vec.x = Math.PI;
		expect(vec.x).toBe(Math.PI);

		//@ts-ignore
		vec.index = 1;

		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);

		vec.y = 8;

		expect(vec.y).toBe(8);
	});

	it('works with any field decorator', () => {
		const fields = [
			[struct.u8, 1, Uint8Array],
			[struct.u16, 2, Uint16Array],
			[struct.u32, 4, Uint32Array],
			[struct.u64, 8, BigUint64Array],
			[struct.i8, 1, Int8Array],
			[struct.i16, 2, Int16Array],
			[struct.i32, 4, Int32Array],
			[struct.i64, 8, BigInt64Array],
			[struct.f32, 4, Float32Array],
			[struct.f64, 8, Float64Array],
		] as const;

		for (const [decorator, size, FieldConstructor] of fields) {
			@struct()
			class Comp {
				@decorator() declare field: any;
			}
			//@ts-ignore
			expect(Comp.size).toStrictEqual(size);
			//@ts-ignore
			expect(Comp.schema).toStrictEqual({ field: FieldConstructor });

			const store = { field: new FieldConstructor(1) };

			//@ts-ignore
			const comp = new Comp(store, 0);
		}
	});
}
