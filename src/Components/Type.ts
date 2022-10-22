export enum Type {
	u8,
	u16,
	u32,
	u64,

	i8,
	i16,
	i32,
	i64,

	f32,
	f64,
}

export const typeToBytes = {
	[Type.u8]: 1,
	[Type.u16]: 2,
	[Type.u32]: 4,
	[Type.u64]: 8,

	[Type.i8]: 1,
	[Type.i16]: 2,
	[Type.i32]: 4,
	[Type.i64]: 8,

	[Type.f32]: 4,
	[Type.f64]: 8,
};

export const typeToConstructor = {
	[Type.u8]: Uint8Array,
	[Type.u16]: Uint16Array,
	[Type.u32]: Uint32Array,
	[Type.u64]: BigUint64Array,

	[Type.i8]: Int8Array,
	[Type.i16]: Int16Array,
	[Type.i32]: Int32Array,
	[Type.i64]: BigInt64Array,

	[Type.f32]: Float32Array,
	[Type.f64]: Float64Array,
};

export type TypeToJSType<T extends Type> = T extends Type.u64 | Type.i64
	? bigint
	: number;

export interface TypeToTypedArray {
	[Type.u8]: Uint8Array;
	[Type.u16]: Uint16Array;
	[Type.u32]: Uint32Array;
	[Type.u64]: BigUint64Array;
	[Type.i8]: Int8Array;
	[Type.i16]: Int16Array;
	[Type.i32]: Int32Array;
	[Type.i64]: BigInt64Array;
	[Type.f32]: Float32Array;
	[Type.f64]: Float64Array;
}
