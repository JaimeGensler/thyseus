import { struct, type Store } from 'thyseus';
enum Status {
	Pending,
	Resolved,
	Rejected,
}
enum SortOrder {
	Ascending = -200,
	Descending = 200,
}
enum MathConstants {
	Pi = 3.14159,
	E = 2.71828,
}
class SomeStruct {
	static readonly size = 16;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store) {
		this.math = store.readF64();
		this.order = store.readI16();
		this.status = store.readU8();
	}
	serialize(store: Store) {
		store.writeF64(this.math);
		store.writeI16(this.order);
		store.writeU8(this.status);
	}
	status: Status = Status.Pending;
	order: SortOrder = SortOrder.Ascending;
	math: MathConstants = MathConstants.E;
}
