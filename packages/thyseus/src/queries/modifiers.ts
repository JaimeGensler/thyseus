import { Class } from '../components';
import { World } from '../world';

/**
 * A type that may or may not be present.
 */
export type Maybe<T> = T | undefined;
export class MaybeModifier {
	static intoArgument(_: World, type: Class) {
		return new this(type);
	}

	type: Class;
	constructor(type: Class) {
		this.type = type;
	}
}

export type AccessorDescriptor = Class | MaybeModifier;
export type Accessor = Maybe<object>;
