import { Memory } from '../utils';
import { addField, TYPE_TO_CONSTRUCTOR, type PrimitiveName } from './addField';

export type ArrayOptions = {
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
		);
		const shift = 31 - Math.clz32(typeConstructor.BYTES_PER_ELEMENT);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return Memory.views[type].subarray(
					(this.__$$b + offset[propertyKey]) >> shift,
					((this.__$$b + offset[propertyKey]) >> shift) + length,
				);
			},
			set(value: Uint8Array) {
				(Memory.views[type] as Uint8Array).set(
					value.subarray(0, length),
					(this.__$$b + offset[propertyKey]) >> shift,
				);
			},
		});
	};
}
