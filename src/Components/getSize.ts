import { typeToBytes } from './Type';
import type { Schema } from './types';

export default function getSize(schema: Schema): number {
	return Object.values(schema).reduce(
		(acc, field) => acc + typeToBytes[field],
		0,
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { Type } = await import('./Type');

	it('sums the byte-lengths of each value', () => {
		expect(getSize({ x: Type.i32 })).toBe(4);
		expect(getSize([Type.u64])).toBe(8);
		expect(getSize([Type.u8, Type.u16])).toBe(3);
		expect(
			getSize({ a: Type.f32, b: Type.f64, c: Type.f64, d: Type.u8 }),
		).toBe(21);
	});
}
