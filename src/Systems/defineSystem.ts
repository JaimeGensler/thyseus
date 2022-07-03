import type { Descriptor, DescriptorToArgument } from './Parameter';

type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: DescriptorToArgument<T[Index]>;
};

export interface SystemDefinition<T extends Descriptor[] = any> {
	(...args: Parameters<T>): void;
	parameters?: T;
}
export default function defineSystem<T extends Descriptor[]>(
	parameters: [...T],
	definition: (...args: Parameters<T>) => void,
): SystemDefinition<T> {
	//@ts-ignore: You can add properties to functions.
	definition.parameters = parameters;
	//@ts-ignore: This is the correct type now.
	return definition;
}
