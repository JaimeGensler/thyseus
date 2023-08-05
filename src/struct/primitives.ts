export type u8 = number;
export type u16 = number;
export type u32 = number;
export type u64 = bigint;

export type i8 = number;
export type i16 = number;
export type i32 = number;
export type i64 = bigint;

export type f32 = number;
export type f64 = number;

export const numeric = {
	u8: 0,
	u16: 1,
	u32: 2,
	u64: 3,

	i8: 0,
	i16: 1,
	i32: 2,
	i64: 3,

	f32: 2,
	f64: 3,
};
export type Numeric = keyof typeof numeric;
