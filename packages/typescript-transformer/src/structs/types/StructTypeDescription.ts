import ts from 'typescript';
import { getOriginalDeclaration } from ':transform-utils';
import { AND } from ':rule-engine';
import { TypeDescription } from './TypeDescription';
import { getRegistryData } from '../registry';
import { transformStructs } from '../transformStructs';
import { registerHandwrittenStructs } from '../registerHandwrittenStructs';

export class StructTypeDescription extends TypeDescription {
	static test = AND(ts.isTypeReferenceNode, node => {
		const def = getOriginalDeclaration(node);
		if (!def) {
			return false;
		}
		let data = getRegistryData(def as ts.ClassDeclaration);
		if (!data && def && ts.isClassDeclaration(def)) {
			transformStructs(def);
			registerHandwrittenStructs(def);
			data = getRegistryData(def as ts.ClassDeclaration);
		}
		return data !== undefined;
	});

	constructor(node: ts.PropertyDeclaration) {
		super(node);
		const declaration = getOriginalDeclaration(
			(node.type as ts.TypeReferenceNode)!,
		)! as ts.ClassDeclaration;
		const { size, alignment } = getRegistryData(declaration)!;
		this.size = size;
		this.alignment = alignment;
	}

	deserialize() {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createIdentifier('deserialize'),
				),
				undefined,
				[ts.factory.createIdentifier('store')],
			),
		);
	}
	serialize() {
		return ts.factory.createExpressionStatement(
			ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					this.createThisPropertyAccess(),
					ts.factory.createIdentifier('serialize'),
				),
				undefined,
				[ts.factory.createIdentifier('store')],
			),
		);
	}
}
