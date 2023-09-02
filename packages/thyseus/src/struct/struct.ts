export type Class = {
	new (...args: any[]): object;
};

export type Struct = {
	// NOTE: Types are loosened to optional here as the transformer generates
	// these fields. `size` and `alignment` are required, copy and drop are not

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
	 * A function that fully drops an instance of a struct.
	 */
	drop?(pointer: number): void;

	new (): object;
};

export type StructInstance = {
	__$$b: number;
	serialize(): void;
	deserialize(): void;
};

export function struct(targetClass: Class): void;
export function struct(
	targetClass: Class,
	context: ClassDecoratorContext,
): void;
export function struct(): any {}
