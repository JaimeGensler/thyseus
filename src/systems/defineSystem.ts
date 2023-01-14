import { SystemDefinition } from './SystemDefinition';
import type { Descriptors, Descriptor } from './descriptors';

type SystemArguments<T extends Descriptor[]> = {
	[Index in keyof T]: ReturnType<T[Index]['intoArgument']>;
};
export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: (...args: SystemArguments<T>) => void | Promise<void>,
): SystemDefinition<SystemArguments<T>> {
	return new SystemDefinition(parameters, fn);
}
