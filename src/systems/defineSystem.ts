import { SystemDefinition, type SystemFunction } from './SystemDefinition';
import type { Descriptors, Descriptor } from './descriptors';

export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: SystemFunction<{
		[Index in keyof T]: ReturnType<T[Index]['intoArgument']>;
	}>,
) {
	return new SystemDefinition(parameters, fn);
}
