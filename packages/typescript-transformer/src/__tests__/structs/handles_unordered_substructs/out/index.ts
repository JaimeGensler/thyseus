import { struct, type Store } from 'thyseus';
class Parent {
	static readonly size = 1;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.inner.deserialize(store);
	}
	serialize(store: Store) {
		this.inner.serialize(store);
	}
	inner: Child = new Child();
}
class Child {
	static readonly size = 1;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.isInner = Boolean(store.readU8());
	}
	serialize(store: Store) {
		store.writeU8(Number(this.isInner));
	}
	isInner: boolean = true;
}
