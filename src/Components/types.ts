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
type TypedArray =
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

type Schema = Record<string | symbol, TypedArrayConstructor>;
export type ComponentStore = Record<string | symbol, TypedArray>;

export interface ComponentType {
	// NOTE: Types have been loosened to be optional here, as decorators do not provide type info.
	schema?: Schema;
	size?: number;
	// TODO: Narrow store - it can be made more specific, but this makes Entity work for now.
	new (store: any, index: number, commands: WorldCommands): object;
}
