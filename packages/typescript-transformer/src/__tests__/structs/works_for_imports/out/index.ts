import { struct, type Store } from 'thyseus';
import { Vec3 } from './Vec3';
class ContainsVec {
	static readonly size = 16;
	static readonly alignment = 4;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.v3.deserialize(store);
		this.bool = Boolean(store.readU8());
	}
	serialize(store: Store) {
		this.v3.serialize(store);
		store.writeU8(Number(this.bool));
	}
	v3: Vec3 = new Vec3();
	bool: boolean = false;
}
