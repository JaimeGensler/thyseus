import ts from 'typescript';
import { AND, NOT } from ':rule-engine';
import { useTypeChecker } from ':context';

export const isStructDecorator = (node: ts.ModifierLike) =>
	ts.isDecorator(node) && node.expression.getText() === 'struct';

const hasStructDecoration = (node: ts.ClassDeclaration) =>
	!!node.modifiers?.some(isStructDecorator);

export const isStructNeedingTransformation = AND(
	ts.isClassDeclaration,
	hasStructDecoration,
);

const SKIPPED_MODIFIERS = new Set([
	ts.SyntaxKind.AbstractKeyword,
	ts.SyntaxKind.DeclareKeyword,
	ts.SyntaxKind.StaticKeyword,
	ts.SyntaxKind.ReadonlyKeyword,
]);
const hasOnlyValidModifiers = (node: ts.PropertyDeclaration) =>
	!node.modifiers?.some(modifier => SKIPPED_MODIFIERS.has(modifier.kind));

export const isTransformableMember = AND(
	ts.isPropertyDeclaration,
	hasOnlyValidModifiers,
);

const hasSerializeProps = (node: ts.ClassDeclaration) => {
	const checker = useTypeChecker();
	const type = checker.getTypeAtLocation(node);
	return !!type.getProperty('serialize') && !!type.getProperty('deserialize');
};

export const isHandwrittenStruct = AND(
	ts.isClassDeclaration,
	NOT(hasStructDecoration),
	hasSerializeProps,
);

const isStaticMember = (node: ts.PropertyDeclaration) =>
	!!node.modifiers?.some(
		modifier => modifier.kind === ts.SyntaxKind.StaticKeyword,
	);
const hasNumericInitializer = (node: ts.PropertyDeclaration) =>
	!!(node.initializer && ts.isNumericLiteral(node.initializer));
export const isSizeProperty = AND(
	ts.isPropertyDeclaration,
	isStaticMember,
	hasNumericInitializer,
	node => node.name.getText() === 'size',
);
export const isAlignmentProperty = AND(
	ts.isPropertyDeclaration,
	isStaticMember,
	hasNumericInitializer,
	node => node.name.getText() === 'alignment',
);
export const isDropProperty = AND(
	ts.isMethodDeclaration,
	isStaticMember,
	node => node.name.getText() === 'drop',
);
