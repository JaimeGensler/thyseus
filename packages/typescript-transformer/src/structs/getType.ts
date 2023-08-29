import ts from 'typescript';
import {
	ArrayTypeDescription,
	BooleanTypeDescription,
	EnumTypeDescription,
	NumericTypeDescription,
	StringTypeDescription,
	StructTypeDescription,
	TupleTypeDescription,
	type TypeDescription,
} from './types';

const recognizedTypes: (typeof TypeDescription)[] = [
	BooleanTypeDescription,
	NumericTypeDescription,
	StringTypeDescription,
	TupleTypeDescription,
	ArrayTypeDescription,
	EnumTypeDescription,
	StructTypeDescription,
];
export function getType(node: ts.PropertyDeclaration): TypeDescription | null {
	for (const typeDescription of recognizedTypes) {
		if (typeDescription.test(node.type!)) {
			return new typeDescription(node);
		}
	}
	return null;
}
