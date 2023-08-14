import ts from 'typescript';
import { getOriginalDeclaration } from './getOriginalDeclaration';

const isExtendsClause = (clause: ts.HeritageClause) =>
	clause.token === ts.SyntaxKind.ExtendsKeyword;

export function getParentDeclaration(
	node: ts.ClassDeclaration,
): ts.ClassDeclaration | undefined {
	const extendClause = node.heritageClauses?.find(isExtendsClause);
	return extendClause
		? (getOriginalDeclaration(extendClause.types[0] as any, true) as any)
		: undefined;
}
