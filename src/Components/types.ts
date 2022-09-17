import type { Type, TypeToTypedArray } from './Type';

type SchemaField = Type;
export type Schema = SchemaField[] | { [key: string]: SchemaField };

export type ComponentStore<T extends Schema = Schema> = {
	[Key in keyof T]: TypeToTypedArray<T[Key] extends Type ? T[Key] : never>;
};

export type SchemaInstance<T extends Schema> = {
	[Key in keyof T]: T[Key] extends Type.u64 | Type.i64 ? bigint : number;
};
export interface ComponentType<T extends Schema = {}> {
	schema: T;
	size: number;
	new (store: ComponentStore<T>, index: number): object;
}
