import { struct, type u8, type i32, type Store } from 'thyseus';
class PrivateData {
	static readonly size = 24;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.#private = store.readF64();
		this.#otherPrivateData[0] = store.readI32();
		this.#otherPrivateData[1] = store.readI32();
		this.notPrivate = store.readU8();
		store.offset += 7;
	}
	serialize(store: Store) {
		store.writeF64(this.#private);
		store.writeI32(this.#otherPrivateData[0]);
		store.writeI32(this.#otherPrivateData[1]);
		store.writeU8(this.notPrivate);
		store.offset += 7;
	}
	notPrivate: u8 = 0;
	#private: number = 0;
	#otherPrivateData: [i32, i32] = [0, 0];
}
