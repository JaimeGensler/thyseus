import { descriptors, type Descriptors, type Descriptor } from './descriptors';

export type SystemFunction<T extends any[]> = (...args: T) => any;
type ParameterCreator = (descriptors: Descriptors) => Descriptor[];
export type SystemDependencies = {
	dependencies: SystemDefinition[];
	implicitPosition: -1 | 0 | 1;
};

export class SystemDefinition<T extends any[] = any[]> {
	#parameterCreator: ParameterCreator;
	fn: SystemFunction<T>;
	constructor(parameters: ParameterCreator, fn: SystemFunction<T>) {
		this.#parameterCreator = parameters;
		this.fn = fn;
	}
	get parameters(): Descriptor[] {
		return this.#parameterCreator(descriptors);
	}

	clone(): SystemDefinition<T> {
		return new SystemDefinition(this.#parameterCreator, this.fn);
	}
}
