import ts from 'typescript';
import { Export } from './getExports';

const getIfMatchesKey = (key: string) =>
	ts.factory.createBinaryExpression(
		ts.factory.createIdentifier('__k'),
		ts.SyntaxKind.EqualsEqualsEqualsToken,
		ts.factory.createStringLiteral(key),
	);
const post = (result: string) =>
	ts.factory.createExpressionStatement(
		ts.factory.createCallExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier('self'),
				ts.factory.createIdentifier('postMessage'),
			),
			undefined,
			[
				ts.factory.createObjectLiteralExpression([
					ts.factory.createPropertyAssignment(
						'id',
						ts.factory.createIdentifier('__i'),
					),
					ts.factory.createPropertyAssignment(
						'result',
						ts.factory.createIdentifier(result),
					),
				]),
			],
		),
	);
const assign = (variableName: string) =>
	ts.factory.createExpressionStatement(
		ts.factory.createAssignment(
			ts.factory.createIdentifier(variableName),
			ts.factory.createIdentifier('__v'),
		),
	);
const call = (name: string) =>
	ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					'__r',
					undefined,
					undefined,
					ts.factory.createAwaitExpression(
						ts.factory.createCallExpression(
							ts.factory.createIdentifier(name),
							undefined,
							[
								ts.factory.createSpreadElement(
									ts.factory.createIdentifier('__v'),
								),
							],
						),
					),
				),
			],
			ts.NodeFlags.Const,
		),
	);
export function getBlocksFromExports(exports: Export[]) {
	return exports.map(({ key, name, isFunction }) =>
		ts.factory.createIfStatement(
			getIfMatchesKey(key),
			ts.factory.createBlock([
				isFunction ? call(name) : assign(name),
				post(isFunction ? '__r' : 'undefined'),
				ts.factory.createReturnStatement(),
			]),
		),
	);
}
