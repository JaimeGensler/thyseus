import { Memory } from '../utils';

// A string is essentially a Vec<u16> (we assume UTF-16 encoding)
// size: 12 | alignment: 4
// Fields are ordered [length, capacity, pointer]

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
