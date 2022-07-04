import type { Class } from '../utilTypes';
import type { Type, TypeToTypedArray } from './Type';

type SchemaField = Type | SchemaClass<any>;
export type Schema = SchemaField[] | { [key: string]: SchemaField };

type SchemaInstance<T extends Schema> = {
	[Key in keyof T]: T[Key] extends Type.u64 | Type.i64 ? bigint : number;
};
export type SchemaData<T extends Schema = Schema> = {
	[Key in keyof T]: T[Key] extends Type
		? TypeToTypedArray<T[Key]>
		: T extends SchemaClass<infer X>
		? SchemaData<X>
		: SchemaData<T[Key] extends Schema ? T[Key] : never>;
};

export interface SchemaClass<
	T extends Schema = {},
	I extends object = SchemaInstance<T>,
> extends Class<I, [store: SchemaData<T>, index: number]> {
	schema: T;
}
