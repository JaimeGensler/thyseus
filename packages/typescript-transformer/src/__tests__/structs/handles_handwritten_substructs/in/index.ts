import { struct, type u16, type u32, type Store } from 'thyseus';

class Inner {
	static readonly size = 4;
	static readonly alignment = 2;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.someData = store.readU16();
		this.isInner = Boolean(store.readU8());
	}
	serialize(store: Store) {
		store.writeU16(this.someData);
		store.writeU8(Number(this.isInner));
	}
	someData: u16 = 0;
	isInner: boolean = true;
}

@struct
class Wrapper {
	initial: u32 = 0;
	inner: Inner = new Inner();
}
