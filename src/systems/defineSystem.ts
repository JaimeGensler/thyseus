import { SystemDefinition, type SystemFunction } from './SystemDefinition';
import type { Descriptors, Descriptor } from './descriptors';

type UnwrapPromise<T extends any> = T extends Promise<infer X> ? X : T;
export function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: SystemFunction<{
		[Index in keyof T]: UnwrapPromise<ReturnType<T[Index]['intoArgument']>>;
	}>,
) {
	return new SystemDefinition(parameters, fn);
}
