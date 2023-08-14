import { struct } from 'thyseus';
abstract class Abstract {
	static readonly size = 0;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {}
	serialize() {}
	abstract field: number;
}
class Concrete {
	static readonly size = 0;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {}
	serialize() {}
	declare declaredProp: number;
	static staticProp: number;
	readonly prop: number;
}
