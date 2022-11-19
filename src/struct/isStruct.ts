import type { Struct } from './struct';

export function isStruct(val: unknown): val is Struct {
	return (
		typeof val === 'function' &&
		//@ts-ignore
		typeof val.size === 'number' &&
		//@ts-ignore
		typeof val.alignment === 'number' &&
		//@ts-ignore
		typeof val.schema === 'number'
	);
}
