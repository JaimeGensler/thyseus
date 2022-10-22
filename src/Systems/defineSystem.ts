import type { Descriptor, DescriptorToArgument } from './Descriptors';

type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: DescriptorToArgument<T[Index]>;
};

export interface SystemDefinition<T extends Descriptor[] = Descriptor[]> {
	fn(...args: Parameters<T>): void;
	parameters: T;
}
export function defineSystem<T extends Descriptor[]>(
	parameters: [...T],
	fn: (...args: Parameters<T>) => void,
): SystemDefinition<T> {
	return {
		fn,
		parameters,
	};
}
