import ts from 'typescript';
import { useTypeChecker } from ':context';
import { AND } from ':rule-engine';

const hasVariableDeclarationListInitializer = (node: ts.ForOfStatement) =>
	ts.isVariableDeclarationList(node.initializer);

const isQueryOrEventType = (node: ts.ForOfStatement) => {
	const checker = useTypeChecker();
	const expressionType = checker.getTypeAtLocation(node.expression);
	return !!(
		expressionType?.symbol?.escapedName?.startsWith('Query') ||
		expressionType?.symbol?.escapedName?.startsWith('EventReader') ||
		expressionType?.symbol?.escapedName?.startsWith('EventWriter')
	);
};
export const isTransformableForOf = AND(
	ts.isForOfStatement,
	hasVariableDeclarationListInitializer,
	isQueryOrEventType,
);
