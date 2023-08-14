import { struct } from 'thyseus';

@struct
class StringOnly {
	val: string;
}
@struct
class OffsetString {
	first: number;
	val: string;
}
