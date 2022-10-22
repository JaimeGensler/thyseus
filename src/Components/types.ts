import type { WorldCommands } from '../World/WorldCommands';
import type { Type, TypeToTypedArray } from './Type';

type SchemaField = Type;
export type Schema = SchemaField[] | { [key: string]: SchemaField };

export type ComponentStore<T extends Schema = any> = {
	[Key in keyof T]: TypeToTypedArray[T[Key] extends Type ? T[Key] : never];
};

export type SchemaInstance<T extends Schema> = {
	[Key in keyof T]: T[Key] extends Type.u64 | Type.i64 ? bigint : number;
};
export interface ComponentType<T extends Schema = any> {
	schema: T;
	size: number;
	// TODO: Narrow store - it can be made more specific, but this makes Entity work for now.
	new (store: any, index: number, commands: WorldCommands): object;
}
