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

export type Schema = { [key: string | symbol]: TypedArrayConstructor };

export type ComponentStore<T extends Schema = any> = {
	[Key in keyof T]: InstanceType<T[Key]>;
};

export interface ComponentType<T extends Schema = any> {
	schema: T;
	size: number;
	// TODO: Narrow store - it can be made more specific, but this makes Entity work for now.
	new (store: any, index: number, commands: WorldCommands): object;
}
