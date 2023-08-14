import ts from 'typescript';
import { createVisitor } from ':transform-utils';
import { isTransformableForOf } from './rules';

export const transformIterators = createVisitor(isTransformableForOf, node => {
	const variables = getVariableNamesFromForOf(node);

	if (ts.isBlock(node.statement)) {
		return ts.factory.updateForOfStatement(
			node,
			node.awaitModifier,
			node.initializer,
			node.expression,
			ts.factory.updateBlock(node.statement, [
				...variables.map(varName =>
					createSerializationCall(varName, 'deserialize'),
				),
				...node.statement.statements,
				...variables.map(varName =>
					createSerializationCall(varName, 'serialize'),
				),
			]),
		);
	}
	return node;
});

export function createSerializationCall(
	variableName: string,
	methodName: string,
): ts.ExpressionStatement {
	return ts.factory.createExpressionStatement(
		ts.factory.createCallExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier(variableName),
				ts.factory.createIdentifier(methodName),
			),
			undefined,
			undefined,
		),
	);
}

function getVariableNamesFromForOf(node: ts.ForOfStatement): string[] {
	const variableNames: string[] = [];

	if (ts.isVariableDeclarationList(node.initializer)) {
		const declaration = node.initializer.declarations[0];
		if (ts.isIdentifier(declaration.name)) {
			variableNames.push(declaration.name.text);
		} else if (ts.isArrayBindingPattern(declaration.name)) {
			for (const element of declaration.name.elements) {
				if (
					ts.isBindingElement(element) &&
					ts.isIdentifier(element.name)
				) {
					variableNames.push(element.name.text);
				}
			}
		}
	}

	return variableNames;
}
