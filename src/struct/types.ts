import { ComponentType } from '../Components';

export interface Class {
	new (...args: any[]): object;
}
type DiscriminatedUnion<L, R> =
	| (L & { [Key in keyof R]?: never })
	| (R & { [Key in keyof L]?: never });
type PrimitiveName =
	| 'u8'
	| 'u16'
	| 'u32'
	| 'u64'
	| 'i8'
	| 'i16'
	| 'i32'
	| 'i64'
	| 'f32'
	| 'f64';

type ClassDecorator = (targetClass: Class) => any;
type PropertyDecorator = (
	prototype: object,
	propertyKey: string | symbol,
) => void;
export interface StructDecorator {
	(): ClassDecorator;

	bool(): PropertyDecorator;
	u8(): PropertyDecorator;
	u16(): PropertyDecorator;
	u32(): PropertyDecorator;
	u64(): PropertyDecorator;
	i8(): PropertyDecorator;
	i16(): PropertyDecorator;
	i32(): PropertyDecorator;
	i64(): PropertyDecorator;
	f32(): PropertyDecorator;
	f64(): PropertyDecorator;

	string(
		options: DiscriminatedUnion<
			{ byteLength: number },
			{ characterCount: number }
		>,
	): PropertyDecorator;
	array(type: PrimitiveName, length: number): PropertyDecorator;
	component(Component: ComponentType): PropertyDecorator;
}
