import ts from 'typescript';
import {
	ArrayTypeDescription,
	BooleanTypeDescription,
	NumericTypeDescription,
	StringTypeDescription,
	StructTypeDescription,
	TupleTypeDescription,
	type TypeDescription,
} from './types';

const recognizedTypes = [
	NumericTypeDescription,
	BooleanTypeDescription,
	TupleTypeDescription,
	StringTypeDescription,
	ArrayTypeDescription,
	StructTypeDescription,
];
export function getType(node: ts.PropertyDeclaration): TypeDescription | null {
	for (const typeDescription of recognizedTypes) {
		const result = typeDescription.test(node.type!);
		if (result) {
			return new typeDescription(node);
		}
	}
	return null;
}
