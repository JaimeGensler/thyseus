import { struct, deserializeArray, serializeArray, dropArray } from 'thyseus';
class ArrayStruct {
	static readonly size = 24;
	static readonly alignment = 4;
	__$$b = 0;
	deserialize() {
		deserializeArray(this.__$$b, this.a, 'i16');
		deserializeArray(this.__$$b + 12, this.b, 'f64');
	}
	serialize() {
		serializeArray(this.__$$b, this.a, 'i16');
		serializeArray(this.__$$b + 12, this.b, 'f64');
	}
	a: i16[];
	b: Array<number>;
}
