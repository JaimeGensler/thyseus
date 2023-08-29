import { struct, Memory } from 'thyseus';
enum Status {
	Pending,
	Resolved,
	Rejected,
}
class Temp {
	static readonly size = 1;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {
		this.status = Memory.u8[this.__$$b];
	}
	serialize() {
		Memory.u8[this.__$$b] = this.status;
	}
	status: Status = Status.Pending;
}
