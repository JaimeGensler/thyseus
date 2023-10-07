import type { Class, Struct } from '../struct';

// `Read<T>` relies on methods of classes having an `unknown` this type.
// If an explicit `this` type is provided, it will no longer be `unknown`.
type ThislessMethod = (this: unknown, ...args: any[]) => any;

/**
 * A deep version of `Readonly<T>` that also removes methods if they do not
 * explicitly mark their `this` types as `Read<T>`.
 */
export type Read<T> = {
	readonly [Key in keyof T as T[Key] extends ThislessMethod
		? never
		: Key]: T[Key] extends Function ? T[Key] : Read<T[Key]>;
};

export class ReadModifier {
	value: Struct;
	constructor(value: Class) {
		this.value = value;
	}
}
