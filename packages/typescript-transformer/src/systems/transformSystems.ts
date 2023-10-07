import ts from 'typescript';
import { useConfig } from ':context';
import { createVisitor, addImport } from ':transform-utils';
import { isSystem } from './rules';
import { getSignatureDeclaration } from './getSignatureDeclaration';
import { getTypeNameFromNode } from './getTypeNameFromNode';
import { getName } from './getName';

export const transformSystems = createVisitor(isSystem, node => {
	const descriptors = ts.factory.createExpressionStatement(
		ts.factory.createAssignment(
			ts.factory.createPropertyAccessExpression(
				getName(node),
				'parameters',
			),
			ts.factory.createArrayLiteralExpression(
				getSignatureDeclaration(node).parameters.map(parameter =>
					createDescriptorFromTypeNode(parameter.type!, parameter),
				),
			),
		),
	);

	return [node, descriptors];
});

function createDescriptorFromTypeNode(
	node: ts.TypeNode,
	param: ts.ParameterDeclaration,
): ts.NewExpression | ts.Identifier | ts.ArrayLiteralExpression {
	const systemParameters = useConfig('systemParameters');
	if (ts.isTypeReferenceNode(node)) {
		const typeName = getTypeNameFromNode(node);
		const descriptor = systemParameters[typeName];

		if (descriptor) {
			addImport(descriptor.importPath, descriptor.descriptorName);
			return ts.factory.createNewExpression(
				ts.factory.createIdentifier(descriptor.descriptorName),
				undefined,
				node.typeArguments?.map(child =>
					createDescriptorFromTypeNode(child, param),
				) ?? [],
			);
		} else {
			return ts.factory.createIdentifier(typeName);
		}
	} else if (ts.isTupleTypeNode(node)) {
		return ts.factory.createArrayLiteralExpression(
			node.elements.map(child =>
				createDescriptorFromTypeNode(child, param),
			),
		);
	} else {
		return ts.factory.createIdentifier(node.getText());
	}
}
