import { struct, type f32, Memory } from 'thyseus';
export class Vec3 {
	static readonly size = 12;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.x = Memory.f32[this.__$$b >> 2];
		this.y = Memory.f32[(this.__$$b + 4) >> 2];
		this.z = Memory.f32[(this.__$$b + 8) >> 2];
	}
	serialize() {
		Memory.f32[this.__$$b >> 2] = this.x;
		Memory.f32[(this.__$$b + 4) >> 2] = this.y;
		Memory.f32[(this.__$$b + 8) >> 2] = this.z;
	}
	x: f32;
	y: f32;
	z: f32;
}
