import ts from 'typescript';
import { useConfig } from ':context';
import { createVisitor } from ':transform-utils';
import { isSystem } from './rules';
import { getSignatureDeclaration } from './getSignatureDeclaration';
import { getTypeNameFromNode } from './getTypeNameFromNode';
import { getName } from './getName';

export const transformSystems = createVisitor(isSystem, node => {
	const descriptors = ts.factory.createExpressionStatement(
		ts.factory.createAssignment(
			ts.factory.createPropertyAccessExpression(
				getName(node),
				'getSystemArguments',
			),
			ts.factory.createArrowFunction(
				undefined,
				undefined,
				[
					ts.factory.createParameterDeclaration(
						undefined,
						undefined,
						'__w',
						undefined,
						ts.factory.createTypeReferenceNode('any'),
					),
				],
				undefined,
				undefined,
				ts.factory.createArrayLiteralExpression(
					getSignatureDeclaration(node).parameters.map(parameter =>
						createDescriptorFromTypeNode(parameter.type!),
					),
				),
			),
		),
	);

	return [node, descriptors];
});

function createDescriptorFromTypeNode(
	node: ts.TypeNode,
): ts.CallExpression | ts.Identifier | ts.ArrayLiteralExpression {
	const systemParameters = useConfig('systemParameters');
	if (ts.isTypeReferenceNode(node)) {
		const typeName = getTypeNameFromNode(node);

		const isKnownDescriptor = typeName in systemParameters;
		if (isKnownDescriptor) {
			const descriptor = systemParameters[typeName];
			if (!descriptor) {
				return createDescriptorFromTypeNode(node.typeArguments![0]);
			}
			return ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createIdentifier(typeName),
					ts.factory.createIdentifier('intoArgument'),
				),
				undefined,
				[
					ts.factory.createIdentifier('__w'),
					...(node.typeArguments?.map(child =>
						createDescriptorFromTypeNode(child),
					) ?? []),
				],
			);
		} else {
			return ts.factory.createIdentifier(typeName);
		}
	} else if (ts.isTupleTypeNode(node)) {
		return ts.factory.createArrayLiteralExpression(
			node.elements.map(child => createDescriptorFromTypeNode(child)),
		);
	} else if (ts.isImportTypeNode(node) && node.isTypeOf) {
		const text = (node.argument as any).literal.text;
		return ts.factory.createArrayLiteralExpression([
			ts.factory.createArrowFunction(
				undefined,
				undefined,
				[],
				undefined,
				undefined,
				ts.factory.createCallExpression(
					ts.factory.createIdentifier('import'),
					[],
					[ts.factory.createStringLiteral(text)],
				),
			),
			ts.factory.createStringLiteral(text),
		]);
	} else {
		return ts.factory.createIdentifier(node.getText());
	}
}
