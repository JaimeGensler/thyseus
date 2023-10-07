import ts from 'typescript';
import { AND } from ':rule-engine';

export const isThreadStatement = AND(
	ts.isExpressionStatement,
	({ expression }) => {
		// TODO: Handle ('use thread') and "use thread" and `use thread`
		if (ts.isStringLiteral(expression)) {
			return expression.getText() === "'use thread'";
		}
		return false;
	},
);

export const isExportModifier = (modifier: ts.ModifierLike) =>
	modifier.kind === ts.SyntaxKind.ExportKeyword;
