import { struct, Memory } from 'thyseus';
class Vec2 {
	static readonly size = 16;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.x = Memory.f64[this.__$$b >> 3];
		this.y = Memory.f64[(this.__$$b + 8) >> 3];
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.x;
		Memory.f64[(this.__$$b + 8) >> 3] = this.y;
	}
	x: number = 0;
	y: number = 0;
}
class Vec3 extends Vec2 {
	static readonly size = 24;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		super.deserialize();
		this.z = Memory.f64[(this.__$$b + 16) >> 3];
	}
	serialize() {
		super.serialize();
		Memory.f64[(this.__$$b + 16) >> 3] = this.z;
	}
	z: number = 0;
}
