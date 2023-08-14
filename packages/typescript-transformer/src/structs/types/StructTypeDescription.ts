import ts from 'typescript';
import { getOriginalDeclaration } from ':transform-utils';
import { AND } from ':rule-engine';
import { TypeDescription } from './TypeDescription';
import { getRegistryData } from '../registry';
import { transformStructs } from '../transformStructs';
import { registerHandwrittenStructs } from '../registerHandwrittenStructs';

export class StructTypeDescription extends TypeDescription {
	static test = AND(ts.isTypeReferenceNode, node => {
		const def = getOriginalDeclaration(node);
		let data = getRegistryData(def as ts.ClassDeclaration);
		if (!data && def && ts.isClassDeclaration(def)) {
			transformStructs(def);
			registerHandwrittenStructs(def);
			data = getRegistryData(def as ts.ClassDeclaration);
		}
		return data !== undefined;
	});

	constructor(node: ts.PropertyDeclaration) {
		super(node);
		const declaration = getOriginalDeclaration(
			(node.type as ts.TypeReferenceNode)!,
		)! as ts.ClassDeclaration;
		const { size, alignment } = getRegistryData(declaration)!;
		this.size = size;
		this.alignment = alignment;
	}

	serialize(offset: number): ts.Statement[] {
		return [
			this.assignSubstructOffset(offset),
			this.callMethod('serialize'),
		];
	}
	deserialize(offset: number): ts.Statement[] {
		return [
			this.assignSubstructOffset(offset),
			this.callMethod('deserialize'),
		];
	}

	assignSubstructOffset(offset: number): ts.ExpressionStatement {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				ts.factory.createPropertyAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createIdentifier('__$$b'),
				),
				ts.SyntaxKind.EqualsToken,
				this.createByteOffsetAccess(offset, 0),
			),
		);
	}
	callMethod(methodName: string) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createIdentifier(methodName),
				),
				undefined,
				undefined,
			),
		);
	}
}
