import {
	struct,
	type u8,
	type i16,
	type f32,
	type u64,
	type Store,
} from 'thyseus';
class MyClass {
	static readonly size = 16;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.d = store.readU64();
		this.c = store.readF32();
		this.b = store.readI16();
		this.a = store.readU8();
		this.e = Boolean(store.readU8());
	}
	serialize(store: Store) {
		store.writeU64(this.d);
		store.writeF32(this.c);
		store.writeI16(this.b);
		store.writeU8(this.a);
		store.writeU8(Number(this.e));
	}
	a: u8 = 0;
	b: i16 = 0;
	c: f32 = 0;
	d: u64 = 0n;
	e: boolean = false;
}
