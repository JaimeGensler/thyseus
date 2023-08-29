import { struct } from 'thyseus';

enum Status {
	Pending,
	Resolved,
	Rejected,
}

@struct
class Temp {
	status: Status = Status.Pending;
}
