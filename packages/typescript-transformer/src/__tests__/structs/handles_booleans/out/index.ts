import { struct, Memory } from 'thyseus';
class MyClass {
	static readonly size = 1;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {
		this.a = Boolean(Memory.u8[this.__$$b]);
	}
	serialize() {
		Memory.u8[this.__$$b] = Number(this.a);
	}
	a: boolean;
}
