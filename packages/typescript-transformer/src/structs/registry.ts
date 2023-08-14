import ts from 'typescript';

export type StructClassData = {
	size: number;
	alignment: number;
	hasDrop: boolean;
};

const REGISTRY = new Map<string, StructClassData>();
const getRegistryName = (node: ts.ClassDeclaration): string =>
	`${node.getSourceFile().fileName}#${node.name?.getText()}`;

export function setupRegistry() {
	REGISTRY.clear();
}
export function addToRegistry(
	node: ts.ClassDeclaration,
	data: StructClassData,
) {
	REGISTRY.set(getRegistryName(node), data);
}
export function getRegistryData(
	node: ts.ClassDeclaration,
): StructClassData | undefined {
	return REGISTRY.get(getRegistryName(node));
}
export function isInRegistry(node: ts.ClassDeclaration): boolean {
	return REGISTRY.has(getRegistryName(node));
}
