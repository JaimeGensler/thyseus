import { struct, type Store } from 'thyseus';
class MyZST {
	static readonly size = 0;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {}
	serialize(store: Store) {}
}
