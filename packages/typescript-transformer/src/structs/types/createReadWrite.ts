import ts from 'typescript';
import { Numeric } from './numerics';

export function createRead(type: Numeric | 'Boxed', expression: ts.Expression) {
	const isBoxed = type === 'Boxed';
	return ts.factory.createExpressionStatement(
		ts.factory.createBinaryExpression(
			expression,
			ts.SyntaxKind.EqualsToken,
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createIdentifier('store'),
					ts.factory.createIdentifier(
						`read${isBoxed ? type : type.toUpperCase()}`,
					),
				),
				undefined,
				undefined,
			),
		),
	);
}
export function createWrite(
	type: Numeric | 'Boxed',
	expression: ts.Expression,
) {
	const isBoxed = type === 'Boxed';
	return ts.factory.createExpressionStatement(
		ts.factory.createCallExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier('store'),
				ts.factory.createIdentifier(
					`write${isBoxed ? type : type.toUpperCase()}`,
				),
			),
			undefined, // Type arguments, if any
			[expression], // Arguments passed to the method (empty in this case)
		),
	);
}
