import { struct, type Store } from 'thyseus';
class Vec2 {
	static readonly size = 16;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.x = store.readF64();
		this.y = store.readF64();
	}
	serialize(store: Store) {
		store.writeF64(this.x);
		store.writeF64(this.y);
	}
	x: number = 0;
	y: number = 0;
}
class Vec3 extends Vec2 {
	static readonly size = 24;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		super.deserialize(store);
		this.z = store.readF64();
	}
	serialize(store: Store) {
		super.serialize(store);
		store.writeF64(this.z);
	}
	z: number = 0;
}
