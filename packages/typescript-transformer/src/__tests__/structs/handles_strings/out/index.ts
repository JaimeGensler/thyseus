import {
	struct,
	serializeString,
	deserializeString,
	dropString,
	Memory,
} from 'thyseus';
class StringOnly {
	static readonly size = 12;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		this.val = deserializeString(this.__$$b);
	}
	serialize() {
		serializeString(this.__$$b, this.val);
	}
	static drop(offset: number) {
		dropString(offset);
	}
	val: string;
}
class OffsetString {
	static readonly size = 24;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.first = Memory.f64[this.__$$b >> 3];
		this.val = deserializeString(this.__$$b + 8);
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.first;
		serializeString(this.__$$b + 8, this.val);
	}
	static drop(offset: number) {
		dropString(offset);
	}
	first: number;
	val: string;
}
