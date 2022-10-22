import type { Class } from '../Resources';

export interface Mutable<T extends Class> {
	0: T;
	1: 1;
}
export function Mut<T extends Class>(x: T): Mutable<T> {
	return [x, 1];
}

Mut.isMut = function <T extends Class = Class>(x: unknown): x is Mutable<T> {
	return (
		Array.isArray(x) &&
		x.length === 2 &&
		typeof x[0] === 'function' &&
		x[1] === 1
	);
};
