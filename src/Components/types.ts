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

export type ComponentStore = {
	buffer: ArrayBuffer;
	u8: Uint8Array;
	u16?: Uint16Array;
	u32?: Uint32Array;
	u64?: BigUint64Array;
	i8?: Int8Array;
	i16?: Int16Array;
	i32?: Int32Array;
	i64?: BigInt64Array;
	f32?: Float32Array;
	f64?: Float64Array;
};

export interface ComponentType {
	// NOTE: Types have been loosened to be optional here, as decorators do not provide type info.

	/**
	 * The schema bitfield used to create stores for this ComponentType.
	 */
	schema?: number;

	/**
	 * The alignment of this type - equal to the number of bytes of the largest primitive type this ComponentType contains (1, 2, 4, or 8).
	 */
	alignment?: number;

	/**
	 * The size of this ComponentType, including padding. Always a multiple of alignment.
	 */
	size?: number;

	new (store: ComponentStore, index: number, commands: WorldCommands): object;
}
