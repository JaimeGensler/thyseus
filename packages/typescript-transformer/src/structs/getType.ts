import ts from 'typescript';
import {
	BooleanTypeDescription,
	BoxedTypeDescription,
	EnumTypeDescription,
	NumericTypeDescription,
	StructTypeDescription,
	TupleTypeDescription,
	type TypeDescription,
} from './types';

const recognizedTypes: (typeof TypeDescription)[] = [
	BooleanTypeDescription,
	NumericTypeDescription,
	TupleTypeDescription,
	EnumTypeDescription,
	StructTypeDescription,
	BoxedTypeDescription,
];
export function getType(node: ts.PropertyDeclaration): TypeDescription | null {
	for (const typeDescription of recognizedTypes) {
		if (typeDescription.test(node.type!)) {
			return new typeDescription(node);
		}
	}
	return null;
}
