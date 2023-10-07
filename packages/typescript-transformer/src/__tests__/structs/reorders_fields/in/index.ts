import { struct, type u8, type i16, type f32, type u64 } from 'thyseus';

@struct
class MyClass {
	a: u8 = 0;
	b: i16 = 0;
	c: f32 = 0;
	d: u64 = 0n;
	e: boolean = false;
}
