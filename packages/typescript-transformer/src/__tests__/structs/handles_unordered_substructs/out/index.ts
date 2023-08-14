import { struct, Memory } from 'thyseus';
class Parent {
	static readonly size = 1;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {
		this.inner.__$$b = this.__$$b;
		this.inner.deserialize();
	}
	serialize() {
		this.inner.__$$b = this.__$$b;
		this.inner.serialize();
	}
	inner: Child;
}
class Child {
	static readonly size = 1;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {
		this.isInner = Boolean(Memory.u8[this.__$$b]);
	}
	serialize() {
		Memory.u8[this.__$$b] = Number(this.isInner);
	}
	isInner: boolean;
}
