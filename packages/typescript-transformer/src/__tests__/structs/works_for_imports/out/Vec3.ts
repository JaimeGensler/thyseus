import { struct, type f32, type Store } from 'thyseus';
export class Vec3 {
	static readonly size = 12;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.x = store.readF32();
		this.y = store.readF32();
		this.z = store.readF32();
	}
	serialize(store: Store) {
		store.writeF32(this.x);
		store.writeF32(this.y);
		store.writeF32(this.z);
	}
	x: f32 = 0;
	y: f32 = 0;
	z: f32 = 0;
}
