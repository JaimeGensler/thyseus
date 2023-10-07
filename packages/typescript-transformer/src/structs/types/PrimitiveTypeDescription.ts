import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { numerics, type Numeric, getNumericFromType } from './numerics';
import { createRead, createWrite } from './createReadWrite';

export class NumericTypeDescription extends TypeDescription {
	static test = (node: ts.TypeNode) => {
		const text = node.getText();
		return text in numerics || text === 'number';
	};

	#type: Numeric;

	constructor(node: ts.PropertyDeclaration) {
		super(node);
		this.#type = getNumericFromType(node.type!.getText());
		this.size = 1 << numerics[this.#type];
		this.alignment = this.size;
	}

	deserialize() {
		return createRead(this.#type, this.createThisPropertyAccess());
	}
	serialize() {
		return createWrite(this.#type, this.createThisPropertyAccess());
	}
}
export class BooleanTypeDescription extends NumericTypeDescription {
	static test = (node: ts.TypeNode) => node.getText() === 'boolean';

	deserialize() {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.createThisPropertyAccess(),
				ts.SyntaxKind.EqualsToken,
				ts.factory.createCallExpression(
					ts.factory.createIdentifier('Boolean'),
					undefined,
					[
						ts.factory.createCallExpression(
							ts.factory.createPropertyAccessExpression(
								ts.factory.createIdentifier('store'),
								ts.factory.createIdentifier('readU8'),
							),
							undefined,
							undefined,
						),
					],
				),
			),
		);
	}
	serialize() {
		return createWrite(
			'u8',
			ts.factory.createCallExpression(
				ts.factory.createIdentifier('Number'),
				undefined,
				[this.createThisPropertyAccess()],
			),
		);
	}
}
