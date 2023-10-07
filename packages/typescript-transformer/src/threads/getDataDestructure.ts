import ts from 'typescript';
export function getDataDestructure() {
	return ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createObjectBindingPattern([
						ts.factory.createBindingElement(
							undefined,
							'key',
							'__k',
						),
						ts.factory.createBindingElement(
							undefined,
							'value',
							'__v',
						),
						ts.factory.createBindingElement(undefined, 'id', '__i'),
					]),
					undefined,
					undefined,
					ts.factory.createIdentifier('__e.data'),
				),
			],
			ts.NodeFlags.Const,
		),
	);
}
