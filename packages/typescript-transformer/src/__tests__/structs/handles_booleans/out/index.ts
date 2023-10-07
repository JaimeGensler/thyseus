import { struct, type Store } from 'thyseus';
class MyClass {
	static readonly size = 1;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.a = Boolean(store.readU8());
	}
	serialize(store: Store) {
		store.writeU8(Number(this.a));
	}
	a: boolean = false;
}
