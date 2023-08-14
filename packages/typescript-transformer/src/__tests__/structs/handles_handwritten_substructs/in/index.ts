import { struct, type u16, type u32 } from 'thyseus';

class Inner {
	static readonly size = 4;
	static readonly alignment = 2;
	__$$b = 0;
	deserialize() {
		this.someData = Memory.u16[this.__$$b >> 1];
		this.isInner = Boolean(Memory.u8[this.__$$b + 2]);
	}
	serialize() {
		Memory.u16[this.__$$b >> 1] = this.someData;
		Memory.u8[this.__$$b + 2] = Number(this.isInner);
	}
	someData: u16;
	isInner: boolean;
}

@struct
class Wrapper {
	initial: u32;
	inner: Inner;
}
