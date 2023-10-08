import { struct, type Store } from 'thyseus';
class AllNumerics {
	static readonly size = 48;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.u64 = store.readU64();
		this.i64 = store.readI64();
		this.f64 = store.readF64();
		this.u32 = store.readU32();
		this.i32 = store.readI32();
		this.f32 = store.readF32();
		this.u16 = store.readU16();
		this.i16 = store.readI16();
		this.u8 = store.readU8();
		this.i8 = store.readI8();
		store.offset += 6;
	}
	serialize(store: Store) {
		store.writeU64(this.u64);
		store.writeI64(this.i64);
		store.writeF64(this.f64);
		store.writeU32(this.u32);
		store.writeI32(this.i32);
		store.writeF32(this.f32);
		store.writeU16(this.u16);
		store.writeI16(this.i16);
		store.writeU8(this.u8);
		store.writeI8(this.i8);
		store.offset += 6;
	}
	u8: u8 = 0;
	u16: u16 = 0;
	u32: u32 = 0;
	u64: u64 = 0n;
	i8: i8 = 0;
	i16: i16 = 0;
	i32: i32 = 0;
	i64: i64 = 0n;
	f32: f32 = 0;
	f64: f64 = 0;
}
