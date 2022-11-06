import type { WorldCommands } from '../World/WorldCommands';

export type TypedArrayConstructor =
	| Uint8ArrayConstructor
	| Uint16ArrayConstructor
	| Uint32ArrayConstructor
	| BigUint64ArrayConstructor
	| Int8ArrayConstructor
	| Int16ArrayConstructor
	| Int32ArrayConstructor
	| BigInt64ArrayConstructor
	| Float32ArrayConstructor
	| Float64ArrayConstructor;
export type TypedArray =
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array;

export type ComponentStore = Record<string | symbol, TypedArray>;

export interface ComponentType {
	// NOTE: Types have been loosened to be optional here, as decorators do not provide type info.

	/**
	 * The schema used to create stores for this ComponentType.
	 */
	schema?: Record<string | symbol, TypedArrayConstructor>;
	fieldSizes?: Record<string | symbol, number>;

	/**
	 * The size of this type, including padding. Always a multiple of alignment.
	 */
	size?: number;
	/**
	 * The raw size of this type, _not_ including padding.
	 */
	rawSize?: number;
	/**
	 * The alignment of this type - equal to the number of bytes of the largest primitive type this ComponentType contains.
	 */
	alignment?: number;

	// TODO: Narrow store - it can be made more specific, but this makes Entity work for now.
	new (store: any, index: number, commands: WorldCommands): object;
}
