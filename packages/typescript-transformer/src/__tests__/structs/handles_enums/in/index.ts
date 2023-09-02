import { struct } from 'thyseus';

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

@struct
class SomeStruct {
	status: Status = Status.Pending;
	order: SortOrder = SortOrder.Ascending;
	math: MathConstants = MathConstants.E;
}
