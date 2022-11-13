import { addField, TYPE_IDS, resetFields } from './addField';
import type { Class } from '../Resources';
import type {
	ComponentStore,
	TypedArray,
	TypedArrayConstructor,
} from './types';

type DiscriminatedUnion<L, R> =
	| (L & { [Key in keyof R]?: never })
	| (R & { [Key in keyof L]?: never });

export function struct() {
	return function structDecorator(targetClass: Class): any {
		const { schema, size, alignment } = resetFields();
		return class extends targetClass {
			static schema = schema | ((targetClass as any).schema ?? 0);
			static size = size;
			static alignment = alignment;

			__$$s: ComponentStore;
			__$$i: number;
			constructor(store: ComponentStore, index: number) {
				super();
				this.__$$s = store;
				this.__$$i = index;
			}
		};
	};
}
function createPrimativeFieldDecorator(
	type: TypedArrayConstructor,
	storeKey: keyof typeof TYPE_IDS,
) {
	return function () {
		return function fieldDecorator(
			prototype: object,
			propertyKey: string | symbol,
		) {
			const offset = addField(
				propertyKey,
				type.BYTES_PER_ELEMENT,
				type.BYTES_PER_ELEMENT,
				TYPE_IDS[storeKey],
			);
			const size = 1 / type.BYTES_PER_ELEMENT;

			Object.defineProperty(prototype, propertyKey, {
				enumerable: true,
				get() {
					return this.__$$s[storeKey][
						this.__$$i * this.constructor.size * size +
							offset[propertyKey]
					];
				},
				set(value: number) {
					this.__$$s[storeKey][
						this.__$$i * this.constructor.size * size +
							offset[propertyKey]
					] = value;
				},
			});
		};
	};
}

struct.u8 = createPrimativeFieldDecorator(Uint8Array, 'u8');
struct.u16 = createPrimativeFieldDecorator(Uint16Array, 'u16');
struct.u32 = createPrimativeFieldDecorator(Uint32Array, 'u32');
struct.u64 = createPrimativeFieldDecorator(BigUint64Array, 'u64');
struct.i8 = createPrimativeFieldDecorator(Int8Array, 'i8');
struct.i16 = createPrimativeFieldDecorator(Int16Array, 'i16');
struct.i32 = createPrimativeFieldDecorator(Int32Array, 'i32');
struct.i64 = createPrimativeFieldDecorator(BigInt64Array, 'i64');
struct.f32 = createPrimativeFieldDecorator(Float32Array, 'f32');
struct.f64 = createPrimativeFieldDecorator(Float64Array, 'f64');
struct.bool = function () {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const offset = addField(
			propertyKey,
			Uint8Array.BYTES_PER_ELEMENT,
			Uint8Array.BYTES_PER_ELEMENT,
			TYPE_IDS.u8,
		);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return !!this.__$$s.u8[
					this.__$$i * this.constructor.size + offset[propertyKey]
				];
			},
			set(value: boolean) {
				this.__$$s.u8[
					this.__$$i * this.constructor.size + offset[propertyKey]
				] = Number(value);
			},
		});
	};
};

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
		const offset = addField(
			propertyKey,
			Uint8Array.BYTES_PER_ELEMENT,
			byteLength,
		);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				const position =
					this.__$$i * this.constructor.size + offset[propertyKey];

				return decoder
					.decode(
						this.__$$s.u8.subarray(
							position,
							position + byteLength!,
						),
					)
					.split('\u0000')[0];
			},
			set(value: string) {
				const position =
					this.__$$i * this.constructor.size + offset[propertyKey];
				encoder.encodeInto(
					value,
					this.__$$s.u8
						.subarray(position, position + byteLength!)
						.fill(0),
				);
			},
		});
	};
};
const typeToConstructor = {
	u8: Uint8Array,
	u16: Uint16Array,
	u32: Uint32Array,
	u64: BigUint64Array,
	i8: Int8Array,
	i16: Int16Array,
	i32: Int32Array,
	i64: BigInt64Array,
	f32: Float32Array,
	f64: Float64Array,
} as const;
struct.array = function (typeName: keyof typeof TYPE_IDS, length: number) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const typeConstructor = typeToConstructor[typeName];
		const offset = addField(
			propertyKey,
			typeConstructor.BYTES_PER_ELEMENT,
			typeConstructor.BYTES_PER_ELEMENT * length,
			TYPE_IDS[typeName],
		);
		const size = 1 / typeConstructor.BYTES_PER_ELEMENT;
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				const position =
					this.__$$i * this.constructor.size * size +
					offset[propertyKey];
				return this.__$$s[typeName].subarray(
					position,
					position + length,
				);
			},
			set(value: TypedArray) {
				const position =
					this.__$$i * this.constructor.size * size +
					offset[propertyKey];
				this.__$$s[typeName].set(value.subarray(0, length), position);
			},
		});
	};
};

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

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
		@struct()
		class Vec3 {
			declare static schema: number;
			declare __$$i: number;
			@struct.f64() declare x: number;
			@struct.f64() declare y: number;
			@struct.f64() declare z: number;
			constructor(store: ComponentStore, index: number) {}
		}
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

	it.todo('reorders fields as necessary');
}
