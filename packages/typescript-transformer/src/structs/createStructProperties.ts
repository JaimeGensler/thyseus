import ts from 'typescript';
import type { TypeDescription } from './types';
import { addImport } from ':transform-utils';

export function createStructProperties(propertyTypes: TypeDescription[]) {
	addImport('thyseus', 'Store', true);
	propertyTypes.sort((a, z) => z.alignment - a.alignment);

	let offset = 0;
	let alignment = 1;
	let boxedSize = 0;
	const ser: ts.Statement[] = [];
	const deser: ts.Statement[] = [];
	for (const propertyType of propertyTypes) {
		ser.push(...[propertyType.serialize()].flat());
		deser.push(...[propertyType.deserialize()].flat());
		offset += propertyType.size;
		alignment = Math.max(alignment, propertyType.alignment);
		boxedSize += propertyType.boxedSize;
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
		createNumericProperty('boxedSize', boxedSize, [
			ts.SyntaxKind.StaticKeyword,
			ts.SyntaxKind.ReadonlyKeyword,
		]),
		createMethod(
			'deserialize',
			ts.factory.createParameterDeclaration(
				undefined,
				undefined,
				'store',
				undefined,
				ts.factory.createTypeReferenceNode('Store'),
			),
			deser,
		),
		createMethod(
			'serialize',
			ts.factory.createParameterDeclaration(
				undefined,
				undefined,
				'store',
				undefined,
				ts.factory.createTypeReferenceNode('Store'),
			),
			ser,
		),
	];
	return { size, alignment, structProperties };
}

function createMethod(
	name: string,
	parameter: ts.ParameterDeclaration,
	statements: ts.Statement[],
	isStatic: boolean = false,
): ts.MethodDeclaration {
	return ts.factory.createMethodDeclaration(
		isStatic
			? [ts.factory.createToken(ts.SyntaxKind.StaticKeyword)]
			: undefined,
		undefined,
		name,
		undefined,
		undefined,
		[parameter],
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
