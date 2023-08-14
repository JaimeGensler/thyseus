import ts from 'typescript';

export class TypeDescription {
	static test(node: ts.TypeNode) {
		return false;
	}
	size = 0;
	alignment = 1;
	imports: string[] = [];

	name: ts.PropertyName;
	constructor(node: ts.PropertyDeclaration) {
		this.name = node.name;
	}

	serialize(offset: number): ts.Statement | ts.Statement[] {
		return [];
	}
	deserialize(offset: number): ts.Statement | ts.Statement[] {
		return [];
	}
	drop(offset: number): ts.Statement | ts.Statement[] | null {
		return null;
	}

	createThisPropertyAccess(): ts.PropertyAccessExpression {
		return ts.factory.createPropertyAccessExpression(
			ts.factory.createThis(),
			this.name as any,
		);
	}
	createByteOffsetAccess(offset: number, shift: number): ts.Expression {
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

		return shift === 0
			? fullOffset
			: ts.factory.createBinaryExpression(
					offset > 0
						? ts.factory.createParenthesizedExpression(fullOffset)
						: fullOffset,
					ts.SyntaxKind.GreaterThanGreaterThanToken,
					ts.factory.createNumericLiteral(shift),
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
