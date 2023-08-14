import ts from 'typescript';

const importsToAdd = new Map<string, Set<string>>();

export function addImport(path: string, name: string): void {
	if (!importsToAdd.has(path)) {
		importsToAdd.set(path, new Set());
	}
	importsToAdd.get(path)!.add(name);
}
export function consumeImports(sourceFile: ts.SourceFile): ts.SourceFile {
	const statements: ts.Statement[] = [];
	const existingImports: Set<string> = new Set();

	// Traverse through the statements of the source file and collect the existing import statements
	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement)) {
			existingImports.add(statement.moduleSpecifier.getText(sourceFile));
			statements.push(statement);
		} else {
			statements.push(statement);
		}
	}

	// Add new import statements for each set of named imports
	for (const [importPath, namedImports] of importsToAdd) {
		const newNamedImportSpecifiers = Array.from(namedImports, name =>
			ts.factory.createImportSpecifier(
				false,
				undefined,
				ts.factory.createIdentifier(name),
			),
		);

		if (!existingImports.has(`'${importPath}'`)) {
			statements.unshift(
				ts.factory.createImportDeclaration(
					undefined,
					ts.factory.createImportClause(
						false,
						undefined,
						ts.factory.createNamedImports(newNamedImportSpecifiers),
					),
					ts.factory.createStringLiteral(importPath, true),
				),
			);
		} else {
			const importIndex = statements.findIndex(
				statement =>
					ts.isImportDeclaration(statement) &&
					statement.moduleSpecifier.getText(sourceFile) ===
						`'${importPath}'`,
			);
			const existingImport = statements[
				importIndex
			] as ts.ImportDeclaration;

			const existingNamedImports =
				(existingImport.importClause?.namedBindings as ts.NamedImports)
					.elements ?? [];

			const allNamedImports = [
				...existingNamedImports.filter(
					existing => !namedImports.has(existing.name.getText()),
				),
				...newNamedImportSpecifiers,
			];

			const updatedImportClause = ts.factory.updateImportClause(
				existingImport.importClause!,
				false,
				undefined,
				ts.factory.createNamedImports(allNamedImports),
			);
			statements[importIndex] = ts.factory.updateImportDeclaration(
				existingImport,
				existingImport.modifiers,
				updatedImportClause,
				existingImport.moduleSpecifier,
				existingImport.assertClause,
			);
		}
	}
	importsToAdd.clear();

	return ts.factory.updateSourceFile(sourceFile, statements);
}
