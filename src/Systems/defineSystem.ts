import { descriptors, type Descriptors, type Descriptor } from './Descriptors';

type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: ReturnType<T[Index]['intoArgument']>;
};

export type SystemDefinition<T extends Descriptor[] = Descriptor[]> = {
	parameters: T;
	fn(...args: Parameters<T>): void | Promise<void>;
};
export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: (...args: Parameters<T>) => void | Promise<void>,
): SystemDefinition<T> {
	return {
		parameters: parameters(descriptors),
		fn,
	};
}
