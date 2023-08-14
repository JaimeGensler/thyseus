import ts from 'typescript';
import type { Rule } from ':rule-engine';

type Visitor<T extends ts.Node> = (node: T) => ts.Node | ts.Node[];
export function createVisitor<T extends ts.Node>(
	rule: Rule<ts.Node, T>,
	visitor: Visitor<T>,
): (node: ts.Node) => ts.Node | ts.Node[] {
	return function filteredVisitor(node: ts.Node) {
		if (!rule(node)) {
			return node;
		}
		return visitor(node as any);
	} as any;
}
