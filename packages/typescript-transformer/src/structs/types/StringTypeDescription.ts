import ts from 'typescript';
import { TypeDescription } from './TypeDescription';

const IMPORTS = [
	'serializeString thyseus',
	'deserializeString thyseus',
	'dropString thyseus',
];
export class StringTypeDescription extends TypeDescription {
	static test = (node: ts.TypeNode) => node.getText() === 'string';

	size = 12;
	alignment = 4;
	imports = IMPORTS;

	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createIdentifier('serializeString'),
				undefined,
				[
					this.createByteOffsetAccess(offset, 0),
					this.createThisPropertyAccess(),
				],
			),
		);
	}
	deserialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.createThisPropertyAccess(),
				ts.SyntaxKind.EqualsToken,
				ts.factory.createCallExpression(
					ts.factory.createIdentifier('deserializeString'),
					undefined,
					[this.createByteOffsetAccess(offset, 0)],
				),
			),
		);
	}

	drop(offset: number) {
		const offsetExpression =
			offset > 0
				? ts.factory.createBinaryExpression(
						ts.factory.createIdentifier('offset'),
						ts.SyntaxKind.PlusToken,
						ts.factory.createNumericLiteral(offset),
				  )
				: ts.factory.createIdentifier('offset');
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createIdentifier('dropString'),
				undefined,
				[offsetExpression],
			),
		);
	}
}
