import type { Type, TypeToTypedArray } from './Type';

type SchemaField = Type | ComponentType<any>;
export type Schema = SchemaField[] | { [key: string]: SchemaField };

export type ComponentStore<T extends Schema = Schema> = {
	[Key in keyof T]: T[Key] extends Type
		? TypeToTypedArray<T[Key]>
		: T extends ComponentType<infer X>
		? ComponentStore<X>
		: ComponentStore<T[Key] extends Schema ? T[Key] : never>;
};

export type SchemaInstance<T extends Schema> = {
	[Key in keyof T]: T[Key] extends Type.u64 | Type.i64 ? bigint : number;
};
export interface ComponentType<
	T extends Schema = {},
	I extends object = SchemaInstance<T>,
> {
	schema: T;
	new (store: ComponentStore<T>, index: number): I;
}
