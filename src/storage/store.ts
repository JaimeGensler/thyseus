import {
	TYPE_IDS,
	TYPE_TO_CONSTRUCTOR,
	type Struct,
	type StructStore,
} from '../struct';
import type { World } from '../world';

const [, ...namesAndConstructors] = Object.entries(TYPE_TO_CONSTRUCTOR) as [
	keyof typeof TYPE_TO_CONSTRUCTOR,
	Uint8ArrayConstructor,
][];

function createSchemaStoreFromRoot(struct: Struct, root: any): StructStore {
	return namesAndConstructors.reduce((acc, [key, TArray]) => {
		if ((TYPE_IDS[key] & struct.schema!) === TYPE_IDS[key]) {
			acc[key] = new TArray(acc.buffer) as any;
		}
		return acc;
	}, root);
}
export function createStore(world: World, struct: Struct, count: number) {
	const buffer = world.createBuffer(struct.size! * count);
	return createSchemaStoreFromRoot(struct, {
		buffer,
		u8: new Uint8Array(buffer),
	});
}
export function resizeStore(store: StructStore, struct: Struct, count: number) {
	const newBuffer = new (store.buffer.constructor as ArrayBufferConstructor)(
		struct.size! * count,
	);
	const u8 = new Uint8Array(newBuffer);
	u8.set(store.u8);

	store.buffer = newBuffer;
	store.u8 = u8;
	return createSchemaStoreFromRoot(struct, store);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { struct } = await import('../struct');

	@struct()
	class Vec3 {
		declare static schema: number;
		declare static size: number;
		declare __$$s: StructStore;
		declare __$$i: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: StructStore, index: number) {}
	}

	const mockWorld: World = {
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: () => 8,
		},
	} as any;

	describe('createStore', () => {
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
			const result = createStore(mockWorld, MyComponent, 8);

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
	});

	describe('resizeStore', () => {
		it('returns an object with the same shape', () => {
			const initialStore = createStore(mockWorld, Vec3, 8);
			const resizedStore = resizeStore(initialStore, Vec3, 16);

			expect(initialStore).toBe(resizedStore);
			expect(resizedStore.buffer.byteLength).toBe(Vec3.size * 16);
			let key: keyof typeof initialStore;
			for (key in initialStore) {
				expect(initialStore[key]!.constructor).toBe(
					resizedStore[key]!.constructor,
				);
			}
		});

		it('copies previous items', () => {
			const initialStore = createStore(mockWorld, Vec3, 8);

			const vec = new Vec3(initialStore, 0);
			const values = [1.2, 0, Math.PI, 3.3, 4.4, 5.5, 6, 7.7];
			values.forEach((val, i) => {
				vec.__$$i = i;
				vec.x = val;
				vec.y = val;
				vec.z = val;
			});

			vec.__$$s = resizeStore(initialStore, Vec3, 16);
			values.forEach((val, i) => {
				vec.__$$i = i;
				expect(vec.x).toBe(val);
				expect(vec.y).toBe(val);
				expect(vec.z).toBe(val);
			});
		});
	});
}
