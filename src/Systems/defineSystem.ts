import { SystemDefinition, type SystemArguments } from './SystemDefinition';
import type { Descriptors, Descriptor } from './Descriptors';

export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: (...args: SystemArguments<T>) => void | Promise<void>,
): SystemDefinition<T> {
	return new SystemDefinition(parameters, fn);
}
