import { descriptors, type Descriptors, type Descriptor } from './Descriptors';
import type { World } from '../world';

type ParameterCreator<T extends Descriptor[]> = (
	descriptors: Descriptors,
) => [...T];
export type SystemArguments<T extends Descriptor[]> = {
	[Index in keyof T]: ReturnType<T[Index]['intoArgument']>;
};
type SystemExecute<T extends Descriptor[]> = (
	...args: SystemArguments<T>
) => void | Promise<void>;

export class SystemDefinition<T extends Descriptor[] = Descriptor[]> {
	isBeforeAll = false;
	isAfterAll = false;

	dependencies = [] as SystemDefinition<any>[];
	dependents = [] as SystemDefinition<any>[];

	#parameterCreator: ParameterCreator<T>;
	fn: SystemExecute<T>;
	constructor(parameters: ParameterCreator<T>, fn: SystemExecute<T>) {
		this.#parameterCreator = parameters;
		this.fn = fn;
	}
	get parameters(): T {
		return this.#parameterCreator(descriptors);
	}

	before(other: SystemDefinition): this {
		this.dependents.push(other);
		other.dependencies.push(this);
		return this;
	}
	after(other: SystemDefinition): this {
		this.dependencies.push(other);
		other.dependents.push(this);
		return this;
	}

	beforeAll(): this {
		this.isAfterAll = false;
		this.isBeforeAll = true;
		return this;
	}
	afterAll(): this {
		this.isBeforeAll = false;
		this.isAfterAll = true;
		return this;
	}

	getArguments(world: World): SystemArguments<T> {
		return this.parameters.map(p => p.intoArgument(world)) as any;
	}
}
