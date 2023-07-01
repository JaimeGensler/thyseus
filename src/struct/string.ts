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
	Memory.u32[pointer >> 2] = value.length;
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
			const fromStart = from + offset[propertyKey];
			const length = Memory.u32[fromStart >> 2];
			const newPointer = length > 0 ? Memory.alloc(length) : 0;
			if (newPointer !== 0) {
				Memory.copy(
					Memory.u32[(fromStart + 8) >> 2],
					length,
					newPointer,
				);
			}
			const toStart = to + offset[propertyKey];
			Memory.u32[toStart >> 2] = length;
			Memory.u32[(toStart + 4) >> 2] = length;
			Memory.u32[(toStart + 8) >> 2] = newPointer;
		},
		drop(pointer) {
			Memory.free(Memory.u32[(pointer + offset[propertyKey] + 8) >> 2]);
		},
	});

	Object.defineProperty(prototype, propertyKey, {
		enumerable: true,
		get() {
			return deserializeString(this.__$$b + offset[propertyKey]);
		},
		set(value: string) {
			console.log(value);
			serializeString(this.__$$b + offset[propertyKey], value);
		},
	});
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;

	beforeEach(() => {
		Memory.init(4_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	it('serializes simple strings', () => {
		const ptr = Memory.alloc(12);
		serializeString(ptr, 'test');
		expect(deserializeString(ptr)).toBe('test');
	});

	it('serializes other strings', () => {
		const ptr = Memory.alloc(12);
		serializeString(ptr, '/Skybox.jpg');
		expect(deserializeString(ptr)).toBe('/Skybox.jpg');
	});
}
