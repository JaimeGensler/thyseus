import { struct, Memory } from 'thyseus';
class MyClass {
	static readonly size = 8;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.a = Memory.f64[this.__$$b >> 3];
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.a;
	}
	a: number;
}
