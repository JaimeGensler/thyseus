import { struct, Memory } from 'thyseus';
class Tuples {
	static readonly size = 56;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.nums[0] = Memory.f64[this.__$$b >> 3];
		this.nums[1] = Memory.f64[(this.__$$b + 8) >> 3];
		this.nums[2] = Memory.f64[(this.__$$b + 16) >> 3];
		this.nums[3] = Memory.f64[(this.__$$b + 24) >> 3];
		this.f32s[0] = Memory.f32[(this.__$$b + 32) >> 2];
		this.f32s[1] = Memory.f32[(this.__$$b + 36) >> 2];
		this.f32s[2] = Memory.f32[(this.__$$b + 40) >> 2];
		this.i16s[0] = Memory.i16[(this.__$$b + 44) >> 1];
		this.i16s[1] = Memory.i16[(this.__$$b + 46) >> 1];
		this.u8s[0] = Memory.u8[this.__$$b + 48];
	}
	serialize() {
		Memory.f64.set(this.nums, this.__$$b >> 3);
		Memory.f32.set(this.f32s, (this.__$$b + 32) >> 2);
		Memory.i16.set(this.i16s, (this.__$$b + 44) >> 1);
		Memory.u8.set(this.u8s, this.__$$b + 48);
	}
	u8s: [u8];
	i16s: [i16, i16];
	f32s: [f32, f32, f32];
	nums: [number, number, number, number];
}
