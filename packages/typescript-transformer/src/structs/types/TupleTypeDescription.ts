import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { numerics, type Numeric, getNumericFromType } from './numerics';
import { AND } from ':rule-engine';
import { createRead, createWrite } from './createReadWrite';

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
	serialize() {
		return Array.from({ length: this.#length }, (_, i) =>
			createWrite(
				this.#type,
				ts.factory.createElementAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createNumericLiteral(i),
				),
			),
		);
	}
	deserialize() {
		return Array.from({ length: this.#length }, (_, i) =>
			createRead(
				this.#type,
				ts.factory.createElementAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createNumericLiteral(i),
				),
			),
		);
	}
}
