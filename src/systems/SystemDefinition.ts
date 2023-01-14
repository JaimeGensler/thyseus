import { descriptors, type Descriptors, type Descriptor } from './descriptors';

type ParameterCreator = (descriptors: Descriptors) => Descriptor[];
type SystemFn<T extends any[]> = (...args: T) => void | Promise<void>;
export type SystemDependencies = {
	dependencies: SystemDefinition[];
	implicitPosition: -1 | 0 | 1;
};

export class SystemDefinition<T extends any[] = any[]> {
	#implicitPosition = 0 as -1 | 0 | 1;
	#dependencies = [] as SystemDefinition<any>[];

	#parameterCreator: ParameterCreator;
	fn: SystemFn<T>;
	constructor(parameters: ParameterCreator, fn: SystemFn<T>) {
		this.#parameterCreator = parameters;
		this.fn = fn;
	}
	get parameters(): Descriptor[] {
		return this.#parameterCreator(descriptors);
	}

	before(...others: SystemDefinition<any>[]): this {
		for (const other of others) {
			other.after(this);
		}
		return this;
	}
	after(...others: SystemDefinition<any>[]): this {
		for (const other of others) {
			this.#dependencies.push(other);
		}
		return this;
	}

	beforeAll(): this {
		this.#implicitPosition = -1;
		return this;
	}
	afterAll(): this {
		this.#implicitPosition = 1;
		return this;
	}

	clone(): SystemDefinition<T> {
		return new SystemDefinition(this.#parameterCreator, this.fn);
	}

	getAndClearDependencies(): SystemDependencies {
		const result = {
			dependencies: this.#dependencies,
			implicitPosition: this.#implicitPosition,
		};
		this.#dependencies = [];
		this.#implicitPosition = 0;
		return result;
	}
}
