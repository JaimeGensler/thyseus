import ts from 'typescript';
import type { TypeDescription } from './types';

export function createStructProperties(propertyTypes: TypeDescription[]) {
	propertyTypes.sort((a, z) => z.alignment - a.alignment);

	let offset = 0;
	let alignment = 1;
	const ser: ts.Statement[] = [];
	const deser: ts.Statement[] = [];
	const drop: (ts.Statement | null)[] = [];
	for (const propertyType of propertyTypes) {
		ser.push(...[propertyType.serialize(offset)].flat());
		deser.push(...[propertyType.deserialize(offset)].flat());
		drop.push(...[propertyType.drop(offset)].flat().filter(Boolean));
		offset += propertyType.size;
		alignment = Math.max(alignment, propertyType.alignment);
	}
	const size = Math.ceil(offset / alignment) * alignment;

	const structProperties = [
		createNumericProperty('size', size, [
			ts.SyntaxKind.StaticKeyword,
			ts.SyntaxKind.ReadonlyKeyword,
		]),
		createNumericProperty('alignment', alignment, [
			ts.SyntaxKind.StaticKeyword,
			ts.SyntaxKind.ReadonlyKeyword,
		]),
		createNumericProperty('__$$b', 0, []),
		createMethod('deserialize', deser),
		createMethod('serialize', ser),
	];
	const hasDrop = drop.length > 0;
	if (hasDrop) {
		structProperties.push(
			createMethod('drop', drop as any, true, [
				ts.factory.createParameterDeclaration(
					undefined,
					undefined,
					'offset',
					undefined,
					ts.factory.createKeywordTypeNode(
						ts.SyntaxKind.NumberKeyword,
					),
				),
			]),
		);
	}
	return { size, alignment, structProperties, hasDrop };
}

function createMethod(
	name: string,
	statements: ts.Statement[],
	isStatic: boolean = false,
	parameters: ts.ParameterDeclaration[] = [],
): ts.MethodDeclaration {
	return ts.factory.createMethodDeclaration(
		isStatic
			? [ts.factory.createToken(ts.SyntaxKind.StaticKeyword)]
			: undefined,
		undefined,
		name,
		undefined,
		undefined,
		parameters,
		undefined,
		ts.factory.createBlock(statements),
	);
}

function createNumericProperty(
	name: string,
	initial: number,
	modifiers: any[],
) {
	return ts.factory.createPropertyDeclaration(
		modifiers.length > 0
			? modifiers.map(modifier => ts.factory.createToken(modifier))
			: undefined,
		name,
		undefined,
		undefined,
		ts.factory.createNumericLiteral(initial),
	);
}
