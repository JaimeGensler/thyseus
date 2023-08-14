import { struct } from 'thyseus';

@struct
class Tuples {
	u8s: [u8];
	i16s: [i16, i16];
	f32s: [f32, f32, f32];
	nums: [number, number, number, number];
}
