import { struct, type u16, type u32, Memory } from 'thyseus';
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
class Wrapper {
	static readonly size = 8;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.initial = Memory.u32[this.__$$b >> 2];
		this.inner.__$$b = this.__$$b + 4;
		this.inner.deserialize();
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.initial;
		this.inner.__$$b = this.__$$b + 4;
		this.inner.serialize();
	}
	initial: u32;
	inner: Inner;
}
