import {
	descriptors,
	type Descriptors,
	type Descriptor,
	type DescriptorToArgument,
} from './Descriptors';

type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: DescriptorToArgument<T[Index]>;
};

export interface SystemDefinition<T extends Descriptor[] = Descriptor[]> {
	parameters: T;
	fn(...args: Parameters<T>): void;
}
export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: (...args: Parameters<T>) => void,
): SystemDefinition<T> {
	return {
		parameters: parameters(descriptors),
		fn,
	};
}
