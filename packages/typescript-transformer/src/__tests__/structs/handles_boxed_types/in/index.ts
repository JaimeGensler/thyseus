import { struct, type i16 } from 'thyseus';
enum StringEnum {
	A = 'A',
	B = 'B',
}
class Mesh {}
@struct
class ArrayStruct {
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
