import { struct, type Store } from 'thyseus';
abstract class Abstract {
	static readonly size = 0;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {}
	serialize(store: Store) {}
	abstract field: number;
}
class Concrete {
	static readonly size = 0;
	static readonly alignment = 1;
	static readonly boxedSize = 0;
	deserialize(store: Store) {}
	serialize(store: Store) {}
	declare declaredProp: number;
	static staticProp: number;
}
