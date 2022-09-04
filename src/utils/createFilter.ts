import type { ComponentType } from '../Components';

export default function createFilter(
	allComponents: ComponentType[],
	queryComponents: ComponentType[],
): bigint {
	return toBits(allComponents, queryComponents);
}

const toBits = (
	allComponents: ComponentType[],
	queryComponents: ComponentType[],
) =>
	queryComponents.reduce(
		(acc, val) => acc | (1n << BigInt(allComponents.indexOf(val))),
		0n,
	);
