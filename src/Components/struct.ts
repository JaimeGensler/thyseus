import type { Class } from '../Resources';
import type { TypedArrayConstructor } from './types';

type DiscriminatedUnion<L, R> =
	| (L & { [Key in keyof R]?: never })
	| (R & { [Key in keyof L]?: never });

let currentSchema: Record<string | symbol, TypedArrayConstructor> = {};
let currentFieldSizes: Record<string | symbol, number> = {};
let currentAlignment = 1;
let currentSize = 0;
const addField = (
	fieldName: string | symbol,
	type: TypedArrayConstructor,
	bytes: number = type.BYTES_PER_ELEMENT,
) => {
	currentSchema[fieldName] = type;
	if (bytes !== type.BYTES_PER_ELEMENT) {
		currentFieldSizes[fieldName] = bytes;
	}
	currentSize += bytes;
	currentAlignment = Math.max(currentAlignment, type.BYTES_PER_ELEMENT);
};

export function struct() {
	return function structDecorator(targetClass: Class): any {
		class StructClass extends targetClass {
			static schema = currentSchema;
			static fieldSizes = currentFieldSizes;
			static size = currentSize;
			static alignment = currentAlignment;

			store: object;
			index: number;
			constructor(store: object, index: number) {
				super();
				this.store = store;
				this.index = index;
			}
		}
		currentSchema = {};
		currentFieldSizes = {};
		currentSize = 0;
		currentAlignment = 1;
		return StructClass;
	};
}
function createPrimativeFieldDecorator(type: TypedArrayConstructor) {
	return function () {
		return function fieldDecorator(
			prototype: object,
			propertyKey: string | symbol,
		) {
			addField(propertyKey, type);
			Object.defineProperty(prototype, propertyKey, {
				enumerable: true,
				get() {
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
		addField(propertyKey, Uint8Array);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return !!this.store[propertyKey][this.index];
			},
			set(value: boolean) {
				this.store[propertyKey][this.index] = Number(value);
			},
		});
	};
};
struct.u8 = createPrimativeFieldDecorator(Uint8Array);
struct.u16 = createPrimativeFieldDecorator(Uint16Array);
struct.u32 = createPrimativeFieldDecorator(Uint32Array);
struct.u64 = createPrimativeFieldDecorator(BigUint64Array);
struct.i8 = createPrimativeFieldDecorator(Int8Array);
struct.i16 = createPrimativeFieldDecorator(Int16Array);
struct.i32 = createPrimativeFieldDecorator(Int32Array);
struct.i64 = createPrimativeFieldDecorator(BigInt64Array);
struct.f32 = createPrimativeFieldDecorator(Float32Array);
struct.f64 = createPrimativeFieldDecorator(Float64Array);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

struct.string = function ({
	characterCount,
	byteLength,
}: DiscriminatedUnion<{ byteLength: number }, { characterCount: number }>) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		byteLength ??= characterCount! * 3;
		addField(propertyKey, Uint8Array, byteLength);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return decoder
					.decode(
						new Uint8Array(
							this.store[propertyKey].buffer,
							this.index * 3,
							byteLength,
						),
					)
					.split('\u0000')[0];
			},
			set(value: string) {
				encoder.encodeInto(
					value,
					new Uint8Array(
						this.store[propertyKey].buffer,
						this.index * 3,
						byteLength,
					).fill(0),
				);
			},
		});
	};
};

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	it('adds a schema and size to decorated classes', () => {
		@struct()
		class CompA {
			declare static schema: object;
		}

		@struct()
		class CompB {
			declare static schema: object;
			@struct.i32() declare myField: number;
		}

		expect(CompA).toHaveProperty('schema', {});
		expect(CompA).toHaveProperty('fieldSizes', {});
		expect(CompB).toHaveProperty('schema', { myField: Int32Array });
		expect(CompB).toHaveProperty('fieldSizes', {});

		expect(CompA.schema).not.toBe(CompB.schema);
	});

	it('creates a getter/setter around fields', () => {
		@struct()
		class Vec3 {
			declare index: number;
			@struct.f64() declare x: number;
			@struct.f64() declare y: number;
			@struct.f64() declare z: number;
			constructor(store: object, index: number) {}
		}
		expect(Vec3).toHaveProperty('schema', {
			x: Float64Array,
			y: Float64Array,
			z: Float64Array,
		});

		const store = {
			x: new Float64Array(8),
			y: new Float64Array(8),
			z: new Float64Array(8),
		};
		store.x[0] = 1;
		store.y[0] = 2;
		store.z[0] = 3;

		const vec = new Vec3(store, 0);

		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);

		vec.x = Math.PI;
		expect(vec.x).toBe(Math.PI);

		vec.index = 1;

		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);

		vec.y = 8;

		expect(vec.y).toBe(8);
	});

	it('works with every primitive decorators', () => {
		const fields = [
			[struct.bool, Uint8Array, false, true],
			[struct.u8, Uint8Array, 0, 1],
			[struct.u16, Uint16Array, 0, 65_535],
			[struct.u32, Uint32Array, 0, 1_000_000],
			[struct.u64, BigUint64Array, 0n, 1_123_000_000n],
			[struct.i8, Int8Array, 0, -100],
			[struct.i16, Int16Array, 0, -16_000],
			[struct.i32, Int32Array, 0, 32],
			[struct.i64, BigInt64Array, 0n, -1_000_000_000n],
			[struct.f32, Float32Array, 0, 15],
			[struct.f64, Float64Array, 0, Math.PI],
		] as const;

		for (const [decorator, FieldConstructor, init, val] of fields) {
			@struct()
			class Comp {
				declare store: object;
				declare index: number;
				declare static schema: object;
				declare static fieldSizes: object;
				@decorator() declare field: any;
				constructor(store: object, index: number) {}
			}

			expect(Comp.schema).toStrictEqual({ field: FieldConstructor });

			const store = { field: new FieldConstructor(2) };

			const comp = new Comp(store, 0);
			expect(comp.field).toBe(init);
			comp.field = val;
			expect(comp.field).toBe(val);
			comp.index = 1;
			expect(comp.field).toBe(init);
		}
	});

	it('works for string fields', () => {
		@struct()
		class Comp {
			declare store: object;
			declare index: number;
			declare static schema: object;
			declare static fieldSizes: object;
			@struct.string({ characterCount: 5 }) declare value: string;
			@struct.string({ byteLength: 1 }) declare value2: string;
			constructor(store: object, index: number) {}
		}

		const store = {
			value: new Uint8Array(5 * 3),
			value2: new Uint8Array(1),
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
}
