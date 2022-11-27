import { addField, TYPE_IDS, TYPE_TO_CONSTRUCTOR } from './addField';

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
type PrimitiveName =
	| 'u8'
	| 'u16'
	| 'u32'
	| 'u64'
	| 'i8'
	| 'i16'
	| 'i32'
	| 'i64'
	| 'f32'
	| 'f64';

type ArrayOptions = {
	type: PrimitiveName;
	length: number;
};
export function array({ type, length }: ArrayOptions) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const typeConstructor = TYPE_TO_CONSTRUCTOR[type];
		const offset = addField(
			propertyKey,
			typeConstructor.BYTES_PER_ELEMENT,
			typeConstructor.BYTES_PER_ELEMENT * length,
			TYPE_IDS[type],
		);
		const shift = 31 - Math.clz32(typeConstructor.BYTES_PER_ELEMENT);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return this.__$$s[type].subarray(
					(this.__$$b >> shift) + offset[propertyKey],
					(this.__$$b >> shift) + offset[propertyKey] + length,
				);
			},
			set(value: TypedArray) {
				this.__$$s[type].set(
					value.subarray(0, length),
					(this.__$$b >> shift) + offset[propertyKey],
				);
			},
		});
	};
}