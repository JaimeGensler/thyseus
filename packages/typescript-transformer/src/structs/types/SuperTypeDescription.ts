import ts from 'typescript';
import { StructClassData, getRegistryData, isInRegistry } from '../registry';
import { getParentDeclaration } from '../../transform-utils/getParentDeclaration';
import { assert } from ':utils';

let heldClassData: StructClassData | null = null;
function isDirectParentStruct(node: ts.ClassDeclaration): boolean {
	const declaration = getParentDeclaration(node);

	if (declaration) {
		assert(
			isInRegistry(declaration as any),
			`Structs may not extend non-struct classes (${node.name?.getText()})`,
		);
		heldClassData = getRegistryData(declaration as any)!;
		return true;
	}
	return false;
}

export class SuperTypeDescription {
	static test = isDirectParentStruct;

	size: number;
	alignment: number;
	name = 'super' as any;
	constructor(node: ts.ClassDeclaration) {
		this.size = heldClassData!.size;
		this.alignment = heldClassData!.alignment;
		heldClassData = null;
	}

	deserialize() {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createSuper(),
					ts.factory.createIdentifier('deserialize'),
				),
				undefined, // Type arguments, if any
				[ts.factory.createIdentifier('store')], // Arguments passed to the method (empty in this case)
			),
		);
	}
	serialize() {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createSuper(),
					ts.factory.createIdentifier('serialize'),
				),
				undefined, // Type arguments, if any
				[ts.factory.createIdentifier('store')], // Arguments passed to the method (empty in this case)
			),
		);
	}

	boxedSize = 0;
	createThisPropertyAccess(): any {}
}
