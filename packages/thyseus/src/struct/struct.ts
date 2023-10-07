import { Store } from '../storage';

export type Class = {
	new (...args: any[]): object;
};

export type Struct = {
	// NOTE: Types are optional here as the transformer generates these fields.
	// `size`, `alignment`, and `boxedSize` are actually required.

	/**
	 * The alignment of this type.
	 * Equal to the number of bytes of the largest primitive type this struct contains (1, 2, 4, or 8).
	 */
	alignment?: number;

	/**
	 * The size of this struct, including padding.
	 * May be `0`.
	 * Always a multiple of alignment.
	 */
	size?: number;

	/**
	 * The number of boxed elements in this struct.
	 */
	boxedSize?: number;

	/**
	 * A function that fully drops an instance of a struct.
	 */
	drop?(pointer: number): void;

	new (): StructInstance;
};

export type StructInstance = {
	serialize?(store: Store): void;
	deserialize?(store: Store): void;
};

export function struct(targetClass: Class): void;
export function struct(
	targetClass: Class,
	context: ClassDecoratorContext,
): void;
export function struct(): any {}
