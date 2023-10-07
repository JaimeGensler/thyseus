import { struct, type u16, type u32 } from 'thyseus';

@struct
class Inner {
	someData: u16 = 0;
	isInner: boolean = true;
}

@struct
class Wrapper {
	initial: u32 = 0;
	inner: Inner = new Inner();
}
