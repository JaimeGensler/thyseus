import type { Descriptor, DescriptorToArgument } from './Parameter';

type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: DescriptorToArgument<T[Index]>;
};

export interface SystemDefinition<T extends Descriptor[] = any> {
	fn(...args: Parameters<T>): void;
	parameters: T;
}
export default function defineSystem<T extends Descriptor[]>(
	parameters: [...T],
	fn: (...args: Parameters<T>) => void,
): SystemDefinition<T> {
	return {
		fn,
		parameters,
	};
}
