import { struct, type u16, type u32 } from 'thyseus';

@struct
class Inner {
	someData: u16;
	isInner: boolean;
}

@struct
class Wrapper {
	initial: u32;
	inner: Inner;
}
