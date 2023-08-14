import { struct, Memory } from 'thyseus';
class MyClass {
	static readonly size = 16;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.d = Memory.u64[this.__$$b >> 3];
		this.c = Memory.f32[(this.__$$b + 8) >> 2];
		this.b = Memory.i16[(this.__$$b + 12) >> 1];
		this.a = Memory.u8[this.__$$b + 14];
		this.e = Boolean(Memory.u8[this.__$$b + 15]);
	}
	serialize() {
		Memory.u64[this.__$$b >> 3] = this.d;
		Memory.f32[(this.__$$b + 8) >> 2] = this.c;
		Memory.i16[(this.__$$b + 12) >> 1] = this.b;
		Memory.u8[this.__$$b + 14] = this.a;
		Memory.u8[this.__$$b + 15] = Number(this.e);
	}
	a: u8;
	b: i16;
	c: f32;
	d: u64;
	e: boolean;
}
