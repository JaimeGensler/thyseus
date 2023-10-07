import { struct, type Store } from 'thyseus';
class Tuples {
	static readonly size = 56;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.nums[0] = store.readF64();
		this.nums[1] = store.readF64();
		this.nums[2] = store.readF64();
		this.nums[3] = store.readF64();
		this.f32s[0] = store.readF32();
		this.f32s[1] = store.readF32();
		this.f32s[2] = store.readF32();
		this.i16s[0] = store.readI16();
		this.i16s[1] = store.readI16();
		this.u8s[0] = store.readU8();
	}
	serialize(store: Store) {
		store.writeF64(this.nums[0]);
		store.writeF64(this.nums[1]);
		store.writeF64(this.nums[2]);
		store.writeF64(this.nums[3]);
		store.writeF32(this.f32s[0]);
		store.writeF32(this.f32s[1]);
		store.writeF32(this.f32s[2]);
		store.writeI16(this.i16s[0]);
		store.writeI16(this.i16s[1]);
		store.writeU8(this.u8s[0]);
	}
	u8s: [u8] = [0];
	i16s: [i16, i16] = [0, 0];
	f32s: [f32, f32, f32] = [0, 0, 0];
	nums: [number, number, number, number] = [0, 0, 0, 0];
}
