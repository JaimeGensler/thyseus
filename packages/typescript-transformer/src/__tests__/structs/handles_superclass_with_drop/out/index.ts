import {
	struct,
	serializeString,
	deserializeString,
	dropString,
	Memory,
} from 'thyseus';
class Parent {
	static readonly size = 12;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.prop = deserializeString(this.__$$b);
	}
	serialize() {
		serializeString(this.__$$b, this.prop);
	}
	static drop(offset: number) {
		dropString(offset);
	}
	prop: string = '';
}
class Child extends Parent {
	static readonly size = 24;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.double = Memory.f64[this.__$$b >> 3];
		this.__$$b += 8;
		super.deserialize();
		this.__$$b -= 8;
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.double;
		this.__$$b += 8;
		super.serialize();
		this.__$$b -= 8;
	}
	static drop(offset: number) {
		super.drop(offset + 8);
	}
	double: number = 0;
}
