import { alignTo8 } from '../utils/alignTo8';
import type { Struct } from '../struct';

export function initStruct(instance: object) {
	const buffer = new ArrayBuffer(
		alignTo8((instance.constructor as Struct).size!),
	);
	//@ts-ignore
	instance.__$$s ??= {
		buffer: buffer,
		u8: new Uint8Array(buffer),
		u16: new Uint16Array(buffer),
		u32: new Uint32Array(buffer),
		u64: new BigUint64Array(buffer),
		i8: new Int8Array(buffer),
		i16: new Int16Array(buffer),
		i32: new Int32Array(buffer),
		i64: new BigInt64Array(buffer),
		f32: new Float32Array(buffer),
		f64: new Float64Array(buffer),
		dataview: new DataView(buffer),
	};
	//@ts-ignore
	instance.__$$b ??= 0;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { struct } = await import('../struct');

	describe('initStruct', () => {
		it('returns an object with TypedArray keys for specified fields', () => {
			@struct()
			class MyComponent {
				declare static size: number;
				@struct.u8() declare a: number;
				@struct.u16() declare b: number;
				@struct.u32() declare c: number;
				@struct.u64() declare d: bigint;
				@struct.i8() declare e: number;
				@struct.i16() declare f: number;
				@struct.i32() declare g: number;
				@struct.i64() declare h: bigint;
				@struct.f32() declare i: number;
				@struct.f64() declare j: number;
				declare __$$s: any;
				declare __$$b: number;
				constructor() {
					initStruct(this);
				}
			}
			const result = new MyComponent();

			expect(result.__$$s.buffer).toBeInstanceOf(ArrayBuffer);
			expect(result.__$$s.u8).toBeInstanceOf(Uint8Array);
			expect(result.__$$s.u16).toBeInstanceOf(Uint16Array);
			expect(result.__$$s.u32).toBeInstanceOf(Uint32Array);
			expect(result.__$$s.u64).toBeInstanceOf(BigUint64Array);
			expect(result.__$$s.i8).toBeInstanceOf(Int8Array);
			expect(result.__$$s.i16).toBeInstanceOf(Int16Array);
			expect(result.__$$s.i32).toBeInstanceOf(Int32Array);
			expect(result.__$$s.i64).toBeInstanceOf(BigInt64Array);
			expect(result.__$$s.f32).toBeInstanceOf(Float32Array);
			expect(result.__$$s.f64).toBeInstanceOf(Float64Array);

			expect(result.__$$b).toBe(0);

			const buffer = result.__$$s.buffer;
			for (const key of Object.keys(result.__$$s).filter(
				x => x !== 'buffer',
			)) {
				expect(result.__$$s[key].buffer).toBe(buffer);
			}
		});
	});
}
