import { struct, type Store } from 'thyseus';
class MyClass {
	static readonly size = 8;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.a = store.readF64();
	}
	serialize(store: Store) {
		store.writeF64(this.a);
	}
	a: number = 0;
}
