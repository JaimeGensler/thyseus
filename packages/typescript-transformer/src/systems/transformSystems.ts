import ts from 'typescript';
import { useConfig } from ':context';
import {
	createVisitor,
	getOriginalDeclaration,
	addImport,
} from ':transform-utils';
import { isSystem } from './rules';
import { getSignatureDeclaration } from './getSignatureDeclaration';
import { getTypeNameFromNode } from './getTypeNameFromNode';
import { transformStructs } from '../structs';
import { isInRegistry } from '../structs/registry';
import { getName } from './getName';
import { createSerializationCall } from '../iterators';

let isInRes = false;
const sers: string[] = [];
export const transformSystems = createVisitor(isSystem, node => {
	sers.length = 0;

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

	if (sers.length === 0 || !ts.isFunctionDeclaration(node)) {
		return [node, descriptors];
	}
	return [
		ts.factory.updateFunctionDeclaration(
			node,
			node.modifiers,
			node.asteriskToken,
			node.name,
			node.typeParameters,
			node.parameters,
			node.type,
			ts.factory.createBlock([
				...sers.map(name =>
					createSerializationCall(name, 'deserialize'),
				),
				...(node.body?.statements ?? []),
				...sers.map(name => createSerializationCall(name, 'serialize')),
			]),
		),
		descriptors,
	];
});

function createDescriptorFromTypeNode(
	node: ts.TypeNode,
	param: ts.ParameterDeclaration,
): ts.NewExpression | ts.Identifier | ts.ArrayLiteralExpression {
	const systemParameters = useConfig('systemParameters');
	if (ts.isTypeReferenceNode(node)) {
		const typeName = getTypeNameFromNode(node);
		const descriptor = systemParameters[typeName];

		if (typeName === 'Res' || typeName === 'SystemRes') {
			isInRes = true;
		}
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
			if (isInRes) {
				isInRes = false;
				const dec = getOriginalDeclaration(node);
				if (dec) {
					transformStructs(dec);
					if (isInRegistry(dec as any)) {
						sers.push(param.name.getText());
					}
				}
			}
			return ts.factory.createIdentifier(typeName);
		}
	} else if (ts.isTupleTypeNode(node)) {
		return ts.factory.createArrayLiteralExpression(
			node.elements.map(child =>
				createDescriptorFromTypeNode(child, param),
			),
		);
	} else {
		if (isInRes) {
			isInRes = false;
			sers.push(param.name.getText());
		}
		return ts.factory.createIdentifier(node.getText());
	}
}
