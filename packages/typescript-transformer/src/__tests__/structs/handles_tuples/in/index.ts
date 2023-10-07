import { struct } from 'thyseus';

@struct
class Tuples {
	u8s: [u8] = [0];
	i16s: [i16, i16] = [0, 0];
	f32s: [f32, f32, f32] = [0, 0, 0];
	nums: [number, number, number, number] = [0, 0, 0, 0];
}
