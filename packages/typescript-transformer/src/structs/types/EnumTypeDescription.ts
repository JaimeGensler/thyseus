import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { useTypeChecker } from ':context';

const IMPORTS = ['Memory thyseus'];
export class EnumTypeDescription extends TypeDescription {
	static test(node: ts.TypeNode): boolean {
		const checker = useTypeChecker();
		const symbol = checker.getTypeAtLocation(node).symbol;
		const dec = symbol.declarations?.[0];
		return !!(
			ts.isTypeReferenceNode(node) &&
			dec &&
			ts.isEnumDeclaration(dec)
		);
	}

	imports = IMPORTS;

	constructor(node: ts.PropertyDeclaration) {
		super(node);

		// Enums must be representable as a u8
		this.size = 1;
		this.alignment = 1;
	}

	serialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.memoryLocation(offset),
				ts.SyntaxKind.EqualsToken,
				this.createThisPropertyAccess(),
			),
		);
	}
	deserialize(offset: number) {
		return ts.factory.createExpressionStatement(
			ts.factory.createBinaryExpression(
				this.createThisPropertyAccess(),
				ts.SyntaxKind.EqualsToken,
				this.memoryLocation(offset),
			),
		);
	}

	memoryLocation(offset: number) {
		return ts.factory.createElementAccessExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createIdentifier('Memory'),
				ts.factory.createIdentifier('u8'),
			),
			this.createByteOffsetAccess(offset, 0),
		);
	}
}
