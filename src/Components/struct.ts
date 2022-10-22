import { Class } from '../Resources';
import { ComponentType } from './types';

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

function createFieldDecorator(fieldType: any, fieldSize: number) {
	return function () {
		return function fieldDecorator(
			prototype: object,
			propertyKey: string | symbol,
		) {
			schema[propertyKey] = fieldType;
			size += fieldSize;
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

struct.u8 = createFieldDecorator(Uint8Array, 1);
struct.u16 = createFieldDecorator(Uint16Array, 2);
struct.u32 = createFieldDecorator(Uint32Array, 4);
struct.u64 = createFieldDecorator(BigUint64Array, 8);
struct.i8 = createFieldDecorator(Int8Array, 1);
struct.i16 = createFieldDecorator(Int16Array, 2);
struct.i32 = createFieldDecorator(Int32Array, 4);
struct.i64 = createFieldDecorator(BigInt64Array, 8);
struct.f32 = createFieldDecorator(Float32Array, 4);
struct.f64 = createFieldDecorator(Float64Array, 8);

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

	it.only('creates a getter/setter around fields', () => {
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

	it.todo('works with any field decorator', () => {});
}
