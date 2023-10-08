import { struct, type u16, type u32, type Store } from 'thyseus';
class Inner {
	static readonly size = 4;
	static readonly alignment = 2;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.someData = store.readU16();
		this.isInner = Boolean(store.readU8());
		store.offset += 1;
	}
	serialize(store: Store) {
		store.writeU16(this.someData);
		store.writeU8(Number(this.isInner));
		store.offset += 1;
	}
	someData: u16 = 0;
	isInner: boolean = true;
}
class Wrapper {
	static readonly size = 8;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.initial = store.readU32();
		this.inner.deserialize(store);
	}
	serialize(store: Store) {
		store.writeU32(this.initial);
		this.inner.serialize(store);
	}
	initial: u32 = 0;
	inner: Inner = new Inner();
}
