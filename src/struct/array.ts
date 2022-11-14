import { addField, TYPE_IDS } from './addField';
import { StructDecorator } from './types';

type TypedArray =
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array;
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
export const array: StructDecorator['array'] = (typeName, length) => {
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
		const shift = 31 - Math.clz32(typeConstructor.BYTES_PER_ELEMENT);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return this.__$$s[typeName].subarray(
					(this.__$$b >> shift) + offset[propertyKey],
					(this.__$$b >> shift) + offset[propertyKey] + length,
				);
			},
			set(value: TypedArray) {
				this.__$$s[typeName].set(
					value.subarray(0, length),
					(this.__$$b >> shift) + offset[propertyKey],
				);
			},
		});
	};
};
