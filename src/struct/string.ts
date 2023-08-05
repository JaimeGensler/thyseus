import { Memory } from '../utils';
import { serializeArray, deserializeArray, dropArray } from './array';

// A string is a wrapper over a u16[] (we assume UTF-16 encoding)
// size: 12 | alignment: 4
// Fields are ordered [length, capacity, pointer]

const charArray: number[] = [];
export function deserializeString(pointer: number): string {
	deserializeArray(pointer, 'u16', charArray);
	return String.fromCharCode(...charArray);
}
export function serializeString(pointer: number, value: string): void {
	for (let i = 0; i < value.length; i++) {
		charArray[i] = value.charCodeAt(i);
	}
	charArray.length = value.length;
	serializeArray(pointer, 'u16', charArray);
}
export function dropString(pointer: number): void {
	dropArray(pointer);
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
