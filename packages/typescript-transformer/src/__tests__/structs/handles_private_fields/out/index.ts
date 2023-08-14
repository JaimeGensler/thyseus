import { struct, type u8, type i32, Memory } from 'thyseus';
class PrivateData {
	static readonly size = 24;
	static readonly alignment = 8;
	__$$b = 0;
	deserialize() {
		this.#private = Memory.f64[this.__$$b >> 3];
		this.#otherPrivateData[0] = Memory.i32[(this.__$$b + 8) >> 2];
		this.#otherPrivateData[1] = Memory.i32[(this.__$$b + 12) >> 2];
		this.notPrivate = Memory.u8[this.__$$b + 16];
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.#private;
		Memory.i32.set(this.#otherPrivateData, (this.__$$b + 8) >> 2);
		Memory.u8[this.__$$b + 16] = this.notPrivate;
	}
	notPrivate: u8;
	#private: number;
	#otherPrivateData: [i32, i32];
}
