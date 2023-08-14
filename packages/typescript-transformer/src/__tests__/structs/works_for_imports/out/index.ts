import { struct, Memory } from 'thyseus';
import { Vec3 } from './Vec3';
class ContainsVec {
	static readonly size = 16;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.v3.__$$b = this.__$$b;
		this.v3.deserialize();
		this.bool = Boolean(Memory.u8[this.__$$b + 12]);
	}
	serialize() {
		this.v3.__$$b = this.__$$b;
		this.v3.serialize();
		Memory.u8[this.__$$b + 12] = Number(this.bool);
	}
	v3: Vec3;
	bool: boolean;
}
