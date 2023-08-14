import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { numerics, type Numeric, getNumericFromType } from './numerics';
import { AND } from ':rule-engine';

const IMPORTS = ['Memory thyseus'];
export class TupleTypeDescription extends TypeDescription {
	static test = AND(ts.isTupleTypeNode, node => {
		const elementType = node.elements[0].getText();
		return (
			(elementType in numerics ||
				elementType === 'number' ||
				elementType === 'boolean') &&
			node.elements.every(element => element.getText() === elementType)
		);
	});

	imports = IMPORTS;

	#type: Numeric;
	#length: number;
	constructor(node: ts.PropertyDeclaration) {
		super(node);
		const elements = (node.type as ts.TupleTypeNode)!.elements;
		this.#type = getNumericFromType(elements[0].getText());
		this.#length = elements.length;

		this.alignment = 1 << numerics[this.#type];
		this.size = this.alignment * elements.length;
	}
	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('Memory'),
						ts.factory.createIdentifier(this.#type),
					),
					ts.factory.createIdentifier('set'),
				),
				undefined,
				[
					this.createThisPropertyAccess(),
					this.createByteOffsetAccess(offset, numerics[this.#type]),
				],
			),
		);
	}
	deserialize(offset: number) {
		return Array.from({ length: this.#length }, (_, i) =>
			ts.factory.createExpressionStatement(
				ts.factory.createBinaryExpression(
					ts.factory.createElementAccessExpression(
						this.createThisPropertyAccess(),
						ts.factory.createNumericLiteral(i),
					),
					ts.SyntaxKind.EqualsToken,
					ts.factory.createElementAccessExpression(
						ts.factory.createPropertyAccessExpression(
							ts.factory.createIdentifier('Memory'),
							ts.factory.createIdentifier(this.#type),
						),
						this.createByteOffsetAccess(
							offset + i * this.alignment,
							numerics[this.#type],
						),
					),
				),
			),
		);
	}
}
