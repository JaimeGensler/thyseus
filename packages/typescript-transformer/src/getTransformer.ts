import ts from 'typescript';
import { consumeImports, shouldIgnoreNode } from ':transform-utils';
import { pipe } from ':utils';
import { useConfig, useProgram, type TransformerConfig } from ':context';
import { transformSystems } from './systems';
// import { transformIterators } from './iterators';
import { transformThreads } from './threads/transformThreads';

const visitors = pipe(
	// registerHandwrittenStructs needs to run before transformStructs
	// Nodes created by transform won't actually exist and cause issues
	transformSystems,
	// transformIterators,
	// transformThreads,
);

export function getTransformer(config?: TransformerConfig) {
	useConfig.set(config);
	return function transformer(
		program: ts.Program,
	): ts.TransformerFactory<ts.SourceFile> {
		useProgram.set(program);
		return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
			function visit(node: ts.Node): ts.Node | ts.NodeArray<any> {
				if (shouldIgnoreNode(node)) {
					return node;
				}

				const result = visitors(node);
				if (Array.isArray(result)) {
					// If we returned a node array, we have to handle visitation
					// ourselves. We must not re-visit nodes that insert new
					// nodes to avoid stack overflow.
					return ts.factory.createNodeArray(
						result.map(newNode =>
							ts.visitEachChild(newNode, visit, context),
						),
					);
				}
				return ts.visitEachChild(result, visit, context);
			}

			return consumeImports(ts.visitNode(file, visit)! as ts.SourceFile);
		};
	};
}
