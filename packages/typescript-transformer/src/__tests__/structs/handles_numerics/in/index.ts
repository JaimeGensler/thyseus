import { struct } from 'thyseus';

@struct
class AllNumerics {
	u8: u8 = 0;
	u16: u16 = 0;
	u32: u32 = 0;
	u64: u64 = 0n;

	i8: i8 = 0;
	i16: i16 = 0;
	i32: i32 = 0;
	i64: i64 = 0n;

	f32: f32 = 0;
	f64: f64 = 0;
}
