import { struct, type u32, Memory } from 'thyseus';
export class Bird {
	static readonly size = 8;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.climate = Memory.u32[this.__$$b >> 2];
		this.canFly = Boolean(Memory.u8[this.__$$b + 4]);
	}
	serialize() {
		Memory.u32[this.__$$b >> 2] = this.climate;
		Memory.u8[this.__$$b + 4] = Number(this.canFly);
	}
	climate: u32 = 0;
	canFly: boolean = true;
}
