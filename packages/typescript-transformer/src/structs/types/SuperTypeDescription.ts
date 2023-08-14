import ts from 'typescript';
import { StructClassData, getRegistryData, isInRegistry } from '../registry';
import { getOriginalDeclaration } from '../../transform-utils/getOriginalDeclaration';
import { getParentDeclaration } from '../../transform-utils/getParentDeclaration';

let heldClassData: StructClassData | null = null;
function isDirectParentStruct(node: ts.ClassDeclaration): boolean {
	const declaration = getParentDeclaration(node);

	if (declaration && isInRegistry(declaration as any)) {
		heldClassData = getRegistryData(declaration as any)!;
		return true;
	}
	return false;
}

const IMPORTS: string[] = [];
export class SuperTypeDescription {
	static test = isDirectParentStruct;

	size: number;
	alignment: number;
	name = 'super' as any;
	imports = IMPORTS;

	#hasDrop: boolean;
	constructor(node: ts.ClassDeclaration) {
		this.size = heldClassData!.size;
		this.alignment = heldClassData!.alignment;
		this.#hasDrop = heldClassData!.hasDrop;
		heldClassData = null;
	}

	serialize(offset: number): ts.Statement | ts.Statement[] {
		return offset === 0
			? this.callMethod('serialize')
			: [
					this.moveSelfOffset(offset, 'add'),
					this.callMethod('serialize'),
					this.moveSelfOffset(offset, 'subtract'),
			  ];
	}
	deserialize(offset: number): ts.Statement | ts.Statement[] {
		return offset === 0
			? this.callMethod('deserialize')
			: [
					this.moveSelfOffset(offset, 'add'),
					this.callMethod('deserialize'),
					this.moveSelfOffset(offset, 'subtract'),
			  ];
	}
	drop(offset: number): ts.Statement | null {
		return this.#hasDrop
			? ts.factory.createExpressionStatement(
					ts.factory.createCallExpression(
						ts.factory.createPropertyAccessExpression(
							ts.factory.createSuper(),
							ts.factory.createIdentifier('drop'),
						),
						undefined,
						[
							ts.factory.createBinaryExpression(
								ts.factory.createIdentifier('offset'),
								ts.SyntaxKind.PlusToken,
								ts.factory.createNumericLiteral(offset),
							),
						],
					),
			  )
			: null;
	}

	moveSelfOffset(offset: number, type: string) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createThis(),
					'__$$b',
				),
				type === 'add'
					? ts.SyntaxKind.PlusEqualsToken
					: ts.SyntaxKind.MinusEqualsToken,
				ts.factory.createNumericLiteral(offset),
			),
		);
	}
	callMethod(methodName: string) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createSuper(),
					ts.factory.createIdentifier(methodName),
				),
				undefined,
				undefined,
			),
		);
	}

	createThisPropertyAccess(): any {}
	createByteOffsetAccess(offset: number, shift: number): any {}
}
