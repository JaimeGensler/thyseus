import ts from 'typescript';
import { isExportModifier } from './rules';

export type Export = {
	key: string;
	name: string;
	isFunction: boolean;
};

export function getExports(node: ts.SourceFile): Export[] {
	const exports: Export[] = [];

	for (const statement of node.statements) {
		if (
			ts.isVariableStatement(statement) &&
			statement.modifiers?.some(isExportModifier)
		) {
			const declaration = statement.declarationList.declarations[0];
			const name =
				statement.declarationList.declarations[0].name.getText();
			const isFunction =
				!!declaration.initializer &&
				(ts.isArrowFunction(declaration.initializer) ||
					ts.isFunctionExpression(declaration.initializer));

			exports.push({
				key: name,
				name,
				isFunction,
			});
		}
		if (
			ts.isFunctionDeclaration(statement) &&
			statement.modifiers?.some(isExportModifier)
		) {
			const name = statement.name!.getText();
			exports.push({ key: name, name, isFunction: true });
		}
	}

	return exports;
}
