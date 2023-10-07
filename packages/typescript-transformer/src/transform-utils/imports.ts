import ts from 'typescript';

type ImportGroup = {
	js: Set<string>;
	type: Set<string>;
};
const importsToAdd = new Map<string, ImportGroup>();

export function addImport(
	path: string,
	name: string,
	isTypeOnly: boolean = false,
): void {
	const quotePath = `'${path}'`;
	if (!importsToAdd.has(quotePath)) {
		importsToAdd.set(quotePath, { js: new Set(), type: new Set() });
	}
	const field = isTypeOnly ? 'type' : 'js';
	importsToAdd.get(quotePath)![field].add(name);
}

export function consumeImports(sourceFile: ts.SourceFile): ts.SourceFile {
	let didUpdateStatements = false;
	const updatedStatements = sourceFile.statements.map(statement => {
		if (!ts.isImportDeclaration(statement)) {
			return statement;
		}
		const path = statement.moduleSpecifier.getText();
		if (!importsToAdd.has(path)) {
			return statement;
		}
		const { js, type } = importsToAdd.get(path)!;

		const namedBindings = statement.importClause?.namedBindings;
		if (namedBindings) {
			if (ts.isNamedImports(namedBindings)) {
				for (const element of namedBindings.elements) {
					js.delete(element.name.getText());
					type.delete(element.name.getText());
				}
			}
		}
		if (js.size === 0 && type.size === 0) {
			return statement;
		}
		importsToAdd.delete(path);
		didUpdateStatements = true;
		return ts.factory.updateImportDeclaration(
			statement,
			statement.modifiers,
			ts.factory.updateImportClause(
				statement.importClause!,
				false,
				statement.importClause!.name,
				ts.factory.updateNamedImports(
					(statement as any).importClause.namedBindings,
					[
						...(statement as any).importClause.namedBindings
							.elements,
						...Array.from(js, item =>
							ts.factory.createImportSpecifier(
								false,
								undefined,
								ts.factory.createIdentifier(item),
							),
						),
						...Array.from(type, item =>
							ts.factory.createImportSpecifier(
								true,
								undefined,
								ts.factory.createIdentifier(item),
							),
						),
					],
				),
			),
			statement.moduleSpecifier,
			statement.assertClause,
		);
	});
	for (const [path, { js, type }] of importsToAdd) {
		updatedStatements.unshift(
			ts.factory.createImportDeclaration(
				undefined,
				ts.factory.createImportClause(
					false,
					undefined,
					ts.factory.createNamedImports([
						...Array.from(js, item =>
							ts.factory.createImportSpecifier(
								false,
								undefined,
								ts.factory.createIdentifier(item),
							),
						),
						...Array.from(type, item =>
							ts.factory.createImportSpecifier(
								true,
								undefined,
								ts.factory.createIdentifier(item),
							),
						),
					]),
				),
				ts.factory.createStringLiteral(path),
			),
		);
	}

	importsToAdd.clear();
	if (didUpdateStatements) {
		return ts.factory.updateSourceFile(sourceFile, updatedStatements);
	}
	return sourceFile;
}
