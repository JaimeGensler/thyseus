import { struct, Memory } from 'thyseus';
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
	__$$b = 0;
	deserialize() {
		this.math = Memory.f64[this.__$$b >> 3];
		this.order = Memory.i16[(this.__$$b + 8) >> 1];
		this.status = Memory.u8[this.__$$b + 10];
	}
	serialize() {
		Memory.f64[this.__$$b >> 3] = this.math;
		Memory.i16[(this.__$$b + 8) >> 1] = this.order;
		Memory.u8[this.__$$b + 10] = this.status;
	}
	status: Status = Status.Pending;
	order: SortOrder = SortOrder.Ascending;
	math: MathConstants = MathConstants.E;
}
