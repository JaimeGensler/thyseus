import { addField } from './addField';
import { Memory } from '../utils/Memory';

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
	const offset = addField(
		propertyKey,
		Uint32Array.BYTES_PER_ELEMENT,
		Uint32Array.BYTES_PER_ELEMENT * 3,
		[8],
	);

	Object.defineProperty(prototype, propertyKey, {
		enumerable: true,
		get() {
			const start = this.__$$b + offset[propertyKey];
			const length = Memory.views.u32[start >> 2];
			const ptr = Memory.views.u32[(start + 8) >> 2];
			return decoder.decode(Memory.views.u8.subarray(ptr, ptr + length));
		},

		set(value: string) {
			const byteLength = getByteLength(value);
			const start = this.__$$b + offset[propertyKey];
			const capacity = Memory.views.u32[(start + 4) >> 2];
			let pointer = Memory.views.u32[(start + 8) >> 2];
			if (capacity < byteLength) {
				const newPointer = Memory.realloc(pointer, byteLength);
				pointer = newPointer;
				Memory.views.u32[(start + 4) >> 2] = byteLength;
				Memory.views.u32[(start + 8) >> 2] = newPointer;
			}

			Memory.views.u32[start >> 2] = byteLength;
			encoder.encodeInto(
				value,
				Memory.views.u8.subarray(pointer, pointer + byteLength!),
			);
		},
	});
}
