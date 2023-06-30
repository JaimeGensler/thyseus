import { addField } from './addField';
import { Memory } from '../utils';

export function deserializeString(pointer: number): string {
	const length = Memory.u32[pointer >> 2];
	const offset = Memory.u32[(pointer + 8) >> 2] >> 1;
	let result = '';
	for (let i = 0; i < length; i++) {
		result += String.fromCharCode(Memory.u16[offset + i]);
	}
	return result;
}
export function serializeString(pointer: number, value: string): void {
	const byteLength = value.length * 2;
	const capacity = Memory.u32[(pointer + 4) >> 2];
	if (byteLength > capacity) {
		Memory.reallocAt(pointer + 8, byteLength);
	}
	const offset = Memory.u32[(pointer + 8) >> 2] >> 1;
	for (let i = 0; i < value.length; i++) {
		Memory.u16[offset + i] = value.charCodeAt(i);
	}
}
export function string(prototype: object, propertyKey: string | symbol) {
	const offset = addField({
		name: propertyKey,
		size: Uint32Array.BYTES_PER_ELEMENT * 3,
		alignment: Uint32Array.BYTES_PER_ELEMENT,
		copy(from, to) {
			const instanceStart = from + offset[propertyKey];
			const length = Memory.u32[instanceStart >> 2];
			const newPointer = length > 0 ? Memory.alloc(length) : 0;
			if (newPointer !== 0) {
				Memory.copy(
					Memory.u32[(instanceStart + 8) >> 2],
					length,
					newPointer,
				);
			}
			const copyStart = to + offset[propertyKey];
			Memory.u32[copyStart >> 2] = length;
			Memory.u32[(copyStart + 4) >> 2] = length;
			Memory.u32[(copyStart + 8) >> 2] = newPointer;
		},
		drop(pointer) {
			Memory.free(Memory.u32[(pointer + offset[propertyKey] + 8) >> 2]);
		},
	});

	Object.defineProperty(prototype, propertyKey, {
		enumerable: true,
		get() {
			deserializeString(this.__$$b + offset[propertyKey]);
		},
		set(value: string) {
			console.log(value);
			serializeString(this.__$$b + offset[propertyKey], value);
		},
	});
}
