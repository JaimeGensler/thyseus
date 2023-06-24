import { Memory } from '../utils';
import { addField, TYPE_TO_CONSTRUCTOR, type PrimitiveName } from './addField';

function createPrimativeFieldDecorator(typeName: PrimitiveName) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const type = TYPE_TO_CONSTRUCTOR[typeName];
		const offset = addField({
			name: propertyKey,
			size: type.BYTES_PER_ELEMENT,
			alignment: type.BYTES_PER_ELEMENT,
		});
		const shift = 31 - Math.clz32(type.BYTES_PER_ELEMENT);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return Memory[typeName][
					(this.__$$b + offset[propertyKey]) >> shift
				];
			},
			set(value: number) {
				Memory[typeName][(this.__$$b + offset[propertyKey]) >> shift] =
					value;
			},
		});
	};
}

export const u8 = createPrimativeFieldDecorator('u8');
export const u16 = createPrimativeFieldDecorator('u16');
export const u32 = createPrimativeFieldDecorator('u32');
export const u64 = createPrimativeFieldDecorator('u64');
export const i8 = createPrimativeFieldDecorator('i8');
export const i16 = createPrimativeFieldDecorator('i16');
export const i32 = createPrimativeFieldDecorator('i32');
export const i64 = createPrimativeFieldDecorator('i64');
export const f32 = createPrimativeFieldDecorator('f32');
export const f64 = createPrimativeFieldDecorator('f64');
export const bool = function fieldDecorator(
	prototype: object,
	propertyKey: string | symbol,
) {
	const offset = addField({
		name: propertyKey,
		size: Uint8Array.BYTES_PER_ELEMENT,
		alignment: Uint8Array.BYTES_PER_ELEMENT,
	});

	Object.defineProperty(prototype, propertyKey, {
		enumerable: true,
		get() {
			return !!Memory.u8[this.__$$b + offset[propertyKey]];
		},
		set(value: boolean) {
			Memory.u8[this.__$$b + offset[propertyKey]] = Number(value);
		},
	});
};
