export const numerics = {
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
} as const;

export type Numeric = keyof typeof numerics;

export function getNumericFromType(str: string): Numeric {
	if (str === 'boolean') {
		return 'u8';
	} else if (str === 'number') {
		return 'f64';
	}
	return str as Numeric;
}
