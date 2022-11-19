import {
	TYPE_IDS,
	TYPE_TO_CONSTRUCTOR,
	type Struct,
	type StructStore,
} from '../struct';
import type { World } from '../World';

const namesAndConstructors = Object.entries(TYPE_TO_CONSTRUCTOR) as [
	keyof typeof TYPE_IDS,
	Uint8ArrayConstructor,
][];

export function createStore(
	world: World,
	ComponentType: Struct,
	count: number = world.config.getNewTableSize(0),
): StructStore {
	const buffer = world.createBuffer(ComponentType.size! * count);

	return namesAndConstructors.reduce(
		(acc, [key, TArray]) => {
			if ((TYPE_IDS[key] & ComponentType.schema!) === TYPE_IDS[key]) {
				acc[key] = new TArray(buffer) as any;
			}
			return acc;
		},
		{ buffer, u8: new Uint8Array(buffer) } as StructStore,
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('../struct');

	const mockWorld: World = {
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: () => 8,
		},
	} as any;

	it('returns an object with TypedArray keys for specified fields, using a single buffer', () => {
		@struct()
		class MyComponent {
			declare static size: number;
			declare static schema: number;
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
		}
		// console.log(MyComponent.)
		const result = createStore(mockWorld, MyComponent);

		expect(result.buffer).toBeInstanceOf(ArrayBuffer);
		expect(result.u8).toBeInstanceOf(Uint8Array);
		expect(result.u16).toBeInstanceOf(Uint16Array);
		expect(result.u32).toBeInstanceOf(Uint32Array);
		expect(result.u64).toBeInstanceOf(BigUint64Array);
		expect(result.i8).toBeInstanceOf(Int8Array);
		expect(result.i16).toBeInstanceOf(Int16Array);
		expect(result.i32).toBeInstanceOf(Int32Array);
		expect(result.i64).toBeInstanceOf(BigInt64Array);
		expect(result.f32).toBeInstanceOf(Float32Array);
		expect(result.f64).toBeInstanceOf(Float64Array);

		const buffer = result.buffer;
		for (const key of Object.keys(result).filter(x => x !== 'buffer')) {
			expect((result as any)[key].buffer).toBe(buffer);
		}
	});

	it('only includes TypedArrays specified by schema (except u8)', () => {
		@struct()
		class MyComponent {
			declare static size: number;
			declare static schema: number;
			@struct.u64() declare a: bigint;
			@struct.i8() declare b: number;
			@struct.f32() declare c: number;
		}
		const buffer = new ArrayBuffer(16);
		expect(createStore(mockWorld, MyComponent, 1)).toStrictEqual({
			buffer,
			u8: new Uint8Array(buffer),
			u64: new BigUint64Array(buffer),
			i8: new Int8Array(buffer),
			f32: new Float32Array(buffer),
		});
	});

	it('always includes buffer and u8', () => {
		class SchemalessComponent {
			static schema = 0;
			static size = 1;
		}
		const result = createStore(mockWorld, SchemalessComponent, 8);
		expect(result).toStrictEqual({
			buffer: new ArrayBuffer(8),
			u8: new Uint8Array(8),
		});
	});

	it('does not require count to be a multiple of 8', () => {
		class SomeComponent {
			static schema = TYPE_IDS.i8 | TYPE_IDS.f32 | TYPE_IDS.u16;
			static size = 8;
			static alignment = 4;
		}
		const result1 = createStore(mockWorld, SomeComponent, 1);
		expect(result1.buffer.byteLength).toBe(8 * 1);
		const result2 = createStore(mockWorld, SomeComponent, 3);
		expect(result2.buffer.byteLength).toBe(8 * 3);
		const result3 = createStore(mockWorld, SomeComponent, 7);
		expect(result3.buffer.byteLength).toBe(8 * 7);
		const result4 = createStore(mockWorld, SomeComponent, 63);
		expect(result4.buffer.byteLength).toBe(8 * 63);

		expect(result4.i8).toBeInstanceOf(Int8Array);
		expect(result4.f32).toBeInstanceOf(Float32Array);
		expect(result4.u16).toBeInstanceOf(Uint16Array);
	});
}
