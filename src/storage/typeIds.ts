export const TYPE_IDS = {
	u8: 1 << 0,
	u16: 1 << 1,
	u32: 1 << 2,
	u64: 1 << 3,
	i8: 1 << 4,
	i16: 1 << 5,
	i32: 1 << 6,
	i64: 1 << 7,
	f32: 1 << 8,
	f64: 1 << 9,
};
export const TYPE_TO_CONSTRUCTOR = {
	u8: Uint8Array,
	u16: Uint16Array,
	u32: Uint32Array,
	u64: BigUint64Array,
	i8: Int8Array,
	i16: Int16Array,
	i32: Int32Array,
	i64: BigInt64Array,
	f32: Float32Array,
	f64: Float64Array,
} as const;
