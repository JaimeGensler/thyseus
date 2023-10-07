import { struct, type u32, type Store } from 'thyseus';
export class Bird {
	static readonly size = 8;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.climate = store.readU32();
		this.canFly = Boolean(store.readU8());
	}
	serialize(store: Store) {
		store.writeU32(this.climate);
		store.writeU8(Number(this.canFly));
	}
	climate: u32 = 0;
	canFly: boolean = true;
}
