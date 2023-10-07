import ts from 'typescript';
import { isThreadStatement } from './rules';
import { createVisitor } from ':transform-utils';
import { getExports } from './getExports';
import { getBlocksFromExports } from './getBlocksFromExports';
import { getDataDestructure } from './getDataDestructure';

export const transformThreads = createVisitor(isThreadStatement, node => {
	const blocks = getBlocksFromExports(getExports(node.getSourceFile()));

	return ts.factory.createCallExpression(
		ts.factory.createPropertyAccessExpression(
			ts.factory.createIdentifier('self'),
			ts.factory.createIdentifier('addEventListener'),
		),
		undefined,
		[
			ts.factory.createStringLiteral('message'), // Event type ('message' in this case)
			ts.factory.createArrowFunction(
				[ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
				undefined,
				[
					ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						'__e',
					),
				],
				undefined,
				ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				ts.factory.createBlock([getDataDestructure(), ...blocks], true),
			),
		],
	);
});
