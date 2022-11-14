import { addField, TYPE_IDS } from './addField';
import type { TypedArrayConstructor } from '../Components/types';

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
			const shift = 31 - Math.clz32(type.BYTES_PER_ELEMENT);

			Object.defineProperty(prototype, propertyKey, {
				enumerable: true,
				get() {
					return this.__$$s[storeKey][
						(this.__$$b >> shift) + offset[propertyKey]
					];
				},
				set(value: number) {
					this.__$$s[storeKey][
						(this.__$$b >> shift) + offset[propertyKey]
					] = value;
				},
			});
		};
	};
}

export const u8 = createPrimativeFieldDecorator(Uint8Array, 'u8');
export const u16 = createPrimativeFieldDecorator(Uint16Array, 'u16');
export const u32 = createPrimativeFieldDecorator(Uint32Array, 'u32');
export const u64 = createPrimativeFieldDecorator(BigUint64Array, 'u64');
export const i8 = createPrimativeFieldDecorator(Int8Array, 'i8');
export const i16 = createPrimativeFieldDecorator(Int16Array, 'i16');
export const i32 = createPrimativeFieldDecorator(Int32Array, 'i32');
export const i64 = createPrimativeFieldDecorator(BigInt64Array, 'i64');
export const f32 = createPrimativeFieldDecorator(Float32Array, 'f32');
export const f64 = createPrimativeFieldDecorator(Float64Array, 'f64');
export const bool = function () {
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
				return !!this.__$$s.u8[this.__$$b + offset[propertyKey]];
			},
			set(value: boolean) {
				this.__$$s.u8[this.__$$b + offset[propertyKey]] = Number(value);
			},
		});
	};
};
