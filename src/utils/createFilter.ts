import type { Struct } from '../struct';

export function createFilter(
	allComponents: Struct[],
	queryComponents: Struct[],
): bigint {
	return toBits(allComponents, queryComponents);
}

const toBits = (allComponents: Struct[], queryComponents: Struct[]) =>
	queryComponents.reduce(
		(acc, val) => acc | (1n << BigInt(allComponents.indexOf(val))),
		0n,
	);
