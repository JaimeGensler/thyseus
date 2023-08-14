import ts from 'typescript';

export function getTypeNameFromNode(node: ts.TypeNode): string {
	return ts.isTypeReferenceNode(node)
		? node.typeName.getText()
		: node.getText();
}
