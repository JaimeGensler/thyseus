import ts from 'typescript';
import { useTypeChecker } from ':context';

export function getOriginalDeclaration(
	node: ts.TypeReferenceNode,
	useExpression: boolean = false,
): ts.Declaration | undefined {
	const checker = useTypeChecker();
	const symbol = checker.getSymbolAtLocation(
		useExpression ? (node as any).expression : node.typeName,
	);
	const declaration = symbol?.declarations?.[0];
	if (
		declaration &&
		(ts.isImportDeclaration(declaration) ||
			ts.isImportSpecifier(declaration))
	) {
		return checker.getAliasedSymbol(symbol!).declarations![0];
	}
	return declaration;
}
