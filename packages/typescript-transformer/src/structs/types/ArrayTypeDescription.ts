import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { getNumericFromType, numerics } from './numerics';
import { extractGeneric } from ':transform-utils';
import { AND, OR } from ':rule-engine';

const isArrayReferenceNode = (node: ts.TypeNode) =>
	ts.isTypeReferenceNode(node) &&
	ts.isIdentifier(node.typeName) &&
	node.typeName.text === 'Array';

const IMPORTS = [
	'deserializeArray thyseus',
	'serializeArray thyseus',
	'dropArray thyseus',
];

export class ArrayTypeDescription extends TypeDescription {
	static test = AND(OR(ts.isArrayTypeNode, isArrayReferenceNode), node => {
		const genericType = extractGeneric(node);
		return (
			genericType in numerics ||
			genericType === 'number' ||
			genericType === 'boolean'
		);
	});

	size = 12;
	alignment = 4;
	imports = IMPORTS;

	#type: string;
	constructor(node: ts.PropertyDeclaration) {
		super(node);
		this.#type = getNumericFromType(extractGeneric(node.type!));
	}

	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createIdentifier('serializeArray'),
				undefined,
				[
					this.createByteOffsetAccess(offset, 0),
					this.createThisPropertyAccess(),
					ts.factory.createStringLiteral(this.#type),
				],
			),
		);
	}
	deserialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createIdentifier('deserializeArray'),
				undefined,
				[
					this.createByteOffsetAccess(offset, 0),
					this.createThisPropertyAccess(),
					ts.factory.createStringLiteral(this.#type),
				],
			),
		);
	}
}
