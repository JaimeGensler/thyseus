import { struct, Memory } from 'thyseus';
class AllNumerics {
	static readonly size = 48;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.u64 = Memory.u64[this.__$$b >> 3];
		this.i64 = Memory.i64[(this.__$$b + 8) >> 3];
		this.f64 = Memory.f64[(this.__$$b + 16) >> 3];
		this.u32 = Memory.u32[(this.__$$b + 24) >> 2];
		this.i32 = Memory.i32[(this.__$$b + 28) >> 2];
		this.f32 = Memory.f32[(this.__$$b + 32) >> 2];
		this.u16 = Memory.u16[(this.__$$b + 36) >> 1];
		this.i16 = Memory.i16[(this.__$$b + 38) >> 1];
		this.u8 = Memory.u8[this.__$$b + 40];
		this.i8 = Memory.i8[this.__$$b + 41];
	}
	serialize() {
		Memory.u64[this.__$$b >> 3] = this.u64;
		Memory.i64[(this.__$$b + 8) >> 3] = this.i64;
		Memory.f64[(this.__$$b + 16) >> 3] = this.f64;
		Memory.u32[(this.__$$b + 24) >> 2] = this.u32;
		Memory.i32[(this.__$$b + 28) >> 2] = this.i32;
		Memory.f32[(this.__$$b + 32) >> 2] = this.f32;
		Memory.u16[(this.__$$b + 36) >> 1] = this.u16;
		Memory.i16[(this.__$$b + 38) >> 1] = this.i16;
		Memory.u8[this.__$$b + 40] = this.u8;
		Memory.i8[this.__$$b + 41] = this.i8;
	}
	u8: u8;
	u16: u16;
	u32: u32;
	u64: u64;
	i8: i8;
	i16: i16;
	i32: i32;
	i64: i64;
	f32: f32;
	f64: f64;
}
