import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { numerics, type Numeric, getNumericFromType } from './numerics';

const IMPORTS = ['Memory thyseus'];
export class NumericTypeDescription extends TypeDescription {
	static test = (node: ts.TypeNode) => {
		const text = node.getText();
		return text in numerics || text === 'number';
	};

	#type: Numeric;
	imports = IMPORTS;

	constructor(node: ts.PropertyDeclaration) {
		super(node);
		this.#type = getNumericFromType(node.type!.getText());
		this.size = 1 << numerics[this.#type];
		this.alignment = this.size;
	}

	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.memoryLocation(offset),
				ts.SyntaxKind.EqualsToken,
				this.createThisPropertyAccess(),
			),
		);
	}
	deserialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.createThisPropertyAccess(),
				ts.SyntaxKind.EqualsToken,
				this.memoryLocation(offset),
			),
		);
	}

	memoryLocation(offset: number) {
		return ts.factory.createElementAccessExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier('Memory'),
				ts.factory.createIdentifier(this.#type),
			),
			this.createByteOffsetAccess(offset, numerics[this.#type]),
		);
	}
}
export class BooleanTypeDescription extends NumericTypeDescription {
	static test = (node: ts.TypeNode) => node.getText() === 'boolean';

	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.memoryLocation(offset),
				ts.SyntaxKind.EqualsToken,
				ts.factory.createCallExpression(
					ts.factory.createIdentifier('Number'),
					undefined,
					[this.createThisPropertyAccess()],
				),
			),
		);
	}
	deserialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.createThisPropertyAccess(),
				ts.SyntaxKind.EqualsToken,
				ts.factory.createCallExpression(
					ts.factory.createIdentifier('Boolean'),
					undefined,
					[this.memoryLocation(offset)],
				),
			),
		);
	}
}
