import ts from 'typescript';

export function getName(
	node: ts.FunctionDeclaration | ts.VariableStatement,
): ts.Expression {
	if (ts.isFunctionDeclaration(node)) {
		return node.name!;
	}
	return ts.factory.createIdentifier(
		node.declarationList.declarations[0].name.getText(),
	);
}
