import { addField } from './addField';
import { Memory } from '../utils';

// Adapted from https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
function getByteLength(val: string) {
	let byteLength = val.length;
	for (let i = val.length - 1; i >= 0; i--) {
		const code = val.charCodeAt(i);
		if (code > 0x7f && code <= 0x7ff) {
			byteLength++;
		} else if (code > 0x7ff && code <= 0xffff) {
			byteLength += 2;
		}
		if (code >= 0xdc00 && code <= 0xdfff) {
			i--;
		}
	}
	return byteLength;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
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
			const start = this.__$$b + offset[propertyKey];
			const length = Memory.u32[start >> 2];
			const ptr = Memory.u32[(start + 8) >> 2];
			return decoder.decode(Memory.u8.subarray(ptr, ptr + length));
		},

		set(value: string) {
			const byteLength = getByteLength(value);
			const start = this.__$$b + offset[propertyKey];
			const capacity = Memory.u32[(start + 4) >> 2];
			let pointer = Memory.u32[(start + 8) >> 2];
			if (capacity < byteLength) {
				const newPointer = Memory.realloc(pointer, byteLength);
				pointer = newPointer;
				Memory.u32[(start + 4) >> 2] = byteLength;
				Memory.u32[(start + 8) >> 2] = newPointer;
			}

			Memory.u32[start >> 2] = byteLength;
			encoder.encodeInto(
				value,
				Memory.u8.subarray(pointer, pointer + byteLength!),
			);
		},
	});
}
