import { ComponentType } from './types';

export function isStruct(val: unknown): val is ComponentType {
	return (
		typeof val === 'function' &&
		//@ts-ignore
		typeof val.size === 'number' &&
		//@ts-ignore
		typeof val.schema === 'object'
	);
}
