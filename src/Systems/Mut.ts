import type { SchemaClass } from '../Components';
import type { Class } from '../utilTypes';

export interface Mutable<T extends Class | SchemaClass<any, any>> {
	0: T;
	1: 1;
}
function Mut<T extends Class | SchemaClass<any, any>>(x: T): Mutable<T> {
	return [x, 1];
}
function isMut<T extends Class | SchemaClass = Class | SchemaClass>(
	x: unknown,
): x is Mutable<T> {
	return (
		Array.isArray(x) &&
		x.length === 2 &&
		typeof x[0] === 'function' &&
		x[1] === 1
	);
}
Mut.is = isMut;
export default Mut;
