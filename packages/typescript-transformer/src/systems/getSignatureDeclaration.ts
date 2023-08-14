import ts from 'typescript';

export function getSignatureDeclaration(
	node: ts.FunctionDeclaration | ts.VariableStatement,
): ts.SignatureDeclaration {
	return ts.isFunctionDeclaration(node)
		? node
		: (node.declarationList.declarations[0]
				.initializer as ts.SignatureDeclaration);
}
