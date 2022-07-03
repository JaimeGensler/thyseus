import { SchemaClass } from '../Components';

export default function createFilter(
	allComponents: SchemaClass[],
	queryComponents: SchemaClass[],
): bigint {
	return toBits(allComponents, queryComponents);
}

const toBits = (allComponents: SchemaClass[], queryComponents: SchemaClass[]) =>
	queryComponents.reduce(
		(acc, val) => acc | (1n << BigInt(allComponents.indexOf(val))),
		0n,
	);
