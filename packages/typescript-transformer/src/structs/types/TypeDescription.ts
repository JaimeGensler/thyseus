import ts from 'typescript';

export class TypeDescription {
	static test(node: ts.TypeNode) {
		return false;
	}
	size: number = 0;
	boxedSize: number = 0;
	alignment: number = 1;

	name: ts.PropertyName;
	constructor(node: ts.PropertyDeclaration) {
		this.name = node.name;
	}

	serialize(): ts.Statement | ts.Statement[] {
		return [];
	}
	deserialize(): ts.Statement | ts.Statement[] {
		return [];
	}

	createThisPropertyAccess(): ts.PropertyAccessExpression {
		return ts.factory.createPropertyAccessExpression(
			ts.factory.createThis(),
			this.name as any,
		);
	}
}

export function createOffset(offset: number, shift: number) {
	const selfOffsetAccess = ts.factory.createPropertyAccessExpression(
		ts.factory.createThis(),
		ts.factory.createIdentifier('__$$b'),
	);
	const fullOffset =
		offset > 0
			? ts.factory.createBinaryExpression(
					selfOffsetAccess,
					ts.SyntaxKind.PlusToken,
					ts.factory.createNumericLiteral(String(offset)),
			  )
			: selfOffsetAccess;
	if (shift > 0) {
		return ts.factory.createBinaryExpression(
			offset > 0
				? ts.factory.createParenthesizedExpression(fullOffset)
				: fullOffset,
			ts.SyntaxKind.GreaterThanGreaterThanToken,
			ts.factory.createNumericLiteral(shift),
		);
	}
	return fullOffset;
}
