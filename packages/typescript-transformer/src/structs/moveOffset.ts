import ts from 'typescript';

export function moveOffset(amount: number) {
	return ts.factory.createExpressionStatement(
		ts.factory.createBinaryExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier('store'),
				ts.factory.createIdentifier('offset'),
			),
			ts.SyntaxKind.PlusEqualsToken,
			ts.factory.createNumericLiteral(amount),
		),
	);
}
