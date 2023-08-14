import ts from 'typescript';
import { AND, OR, type Rule } from ':rule-engine';
import { useConfig } from ':context';
import { getSignatureDeclaration } from './getSignatureDeclaration';
import { getTypeNameFromNode } from './getTypeNameFromNode';

const isFunctionStatement = AND(ts.isVariableStatement, node => {
	const declaration = node.declarationList.declarations[0];
	return !!(
		node.declarationList.declarations.length === 1 &&
		declaration.initializer &&
		(ts.isArrowFunction(declaration.initializer) ||
			ts.isFunctionExpression(declaration.initializer))
	);
});
const allParametersAreSystemParameters = (
	node: ts.FunctionDeclaration | ts.VariableStatement,
) => {
	const signatureDeclaration = getSignatureDeclaration(node);
	return (
		!signatureDeclaration.typeParameters &&
		signatureDeclaration.parameters.length > 0 &&
		signatureDeclaration.parameters.every(isSystemParameter)
	);
};
const isSystemParameter = (node: ts.ParameterDeclaration) =>
	!!node.type &&
	getTypeNameFromNode(node.type) in useConfig('systemParameters');

export const isSystem = AND(
	OR(ts.isFunctionDeclaration, isFunctionStatement),
	allParametersAreSystemParameters,
) as Rule<ts.Node, ts.FunctionDeclaration | ts.VariableStatement>;
