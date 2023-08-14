import ts from 'typescript';

export function extractGeneric(typeNode: ts.TypeNode): string {
	if (ts.isArrayTypeNode(typeNode)) {
		return typeNode.elementType.getText();
	}
	if (
		ts.isTypeReferenceNode(typeNode) &&
		typeNode.typeArguments &&
		typeNode.typeArguments.length === 1
	) {
		return typeNode.typeArguments[0].getText();
	}
	return '';
}
