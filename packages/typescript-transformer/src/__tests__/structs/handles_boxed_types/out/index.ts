import { struct, type i16, type Store } from 'thyseus';
enum StringEnum {
	A = 'A',
	B = 'B',
}
class Mesh {}
class ArrayStruct {
	static readonly size = 8;
	static readonly alignment = 8;
	static readonly boxedSize = 9;
	deserialize(store: Store) {
		this.primitive = store.readF64();
		this.arr1 = store.readBoxed();
		this.arr2 = store.readBoxed();
		this.complexArray = store.readBoxed();
		this.str = store.readBoxed();
		this.strenum = store.readBoxed();
		this.map = store.readBoxed();
		this.set = store.readBoxed();
		this.promise = store.readBoxed();
		this.nonStructInstance = store.readBoxed();
	}
	serialize(store: Store) {
		store.writeF64(this.primitive);
		store.writeBoxed(this.arr1);
		store.writeBoxed(this.arr2);
		store.writeBoxed(this.complexArray);
		store.writeBoxed(this.str);
		store.writeBoxed(this.strenum);
		store.writeBoxed(this.map);
		store.writeBoxed(this.set);
		store.writeBoxed(this.promise);
		store.writeBoxed(this.nonStructInstance);
	}
	arr1: i16[] = [];
	arr2: Array<number> = [];
	complexArray: object[] = [];
	str: string = '';
	strenum: StringEnum = StringEnum.A;
	primitive: number = 0;
	map: Map<symbol, symbol> = new Map();
	set: Set<Function> = new Set();
	promise: Promise<void> = new Promise(r => {});
	nonStructInstance: Mesh = new Mesh();
}
