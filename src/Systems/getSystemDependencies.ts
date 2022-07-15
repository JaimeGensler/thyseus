import assert from '../utils/assert';
import type { SystemDefinition } from './defineSystem';

export interface Dependencies {
	before?: SystemDefinition[];
	after?: SystemDefinition[];
	beforeAll?: boolean;
	afterAll?: boolean;
}

export default function getSystemDependencies(
	systems: SystemDefinition[],
	dependencies: (Dependencies | undefined)[],
	intersections: bigint[],
): bigint[] {
	const dependencyMasks = Array.from({ length: systems.length }, () => 0n);
	const isDependentOn = (a: number, b: number) =>
		(dependencyMasks[a] & (1n << BigInt(b))) !== 0n;

	// Resolve Explicit Dependencies
	dependencies.forEach((dependency, currentIndex) => {
		if (!dependency) return;

		for (const beforeSystem of dependency.before ?? []) {
			const beforeIndex = systems.indexOf(beforeSystem);
			if (beforeIndex === -1) {
				continue;
			}
			assert(
				!isDependentOn(currentIndex, beforeIndex),
				`Circular dependency detected: ${systems[currentIndex].fn.name} (${currentIndex}) and ${systems[beforeIndex].fn.name} (${beforeIndex}) depend on each other.`,
			);
			dependencyMasks[beforeIndex] |= 1n << BigInt(currentIndex);
		}
		for (const afterSystem of dependency.after ?? []) {
			const afterIndex = systems.indexOf(afterSystem);
			if (afterIndex === -1) {
				continue;
			}
			assert(
				!isDependentOn(afterIndex, currentIndex),
				`Circular dependency detected: ${systems[currentIndex].fn.name} (${currentIndex}) and ${systems[afterIndex].fn.name} (${afterIndex}) depend on each other.`,
			);
			dependencyMasks[currentIndex] |= 1n << BigInt(afterIndex);
		}
	});

	dependencyMasks.forEach((_, i) => {
		assert(
			!isDependentOn(i, i),
			`Circular dependency detected: ${systems[i].fn.name} (${i}) and ${systems[i].fn.name} (${i}) depend on each other.`,
		);
	});

	dependencies.forEach((dependency, currentIndex) => {
		if (!dependency) return;

		if (dependency.beforeAll) {
			for (const bit of bits(intersections[currentIndex])) {
				// If this system is not dependent on other system,
				// make other system dependent on this system
				if (
					bit !== currentIndex &&
					(dependencyMasks[currentIndex] & (1n << BigInt(bit))) === 0n
				) {
					dependencyMasks[bit] |= 1n << BigInt(currentIndex);
				}
			}
		}
		if (dependency.afterAll) {
			for (const bit of bits(intersections[currentIndex])) {
				// If other system is not dependent on this system,
				// make this system dependent on other system.
				if (
					bit !== currentIndex &&
					(dependencyMasks[bit] & (1n << BigInt(currentIndex))) === 0n
				) {
					dependencyMasks[currentIndex] |= 1n << BigInt(bit);
				}
			}
		}
	});

	dependencyMasks.forEach((_, i) => (dependencyMasks[i] &= intersections[i]));
	return dependencyMasks;
}

function* bits(val: bigint) {
	let i = 0;
	while (val !== 0n) {
		if ((val & 1n) === 1n) {
			yield i;
		}
		val >>= 1n;
		i++;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	const createMockSystems = (length: number): SystemDefinition[] =>
		Array.from({ length }, () => ({
			fn() {},
			parameters: [],
		}));

	describe('getSystemDependencies', () => {
		it('returns a 0n array if no dependencies are specified', () => {
			expect(
				getSystemDependencies(
					createMockSystems(4),
					[undefined, undefined, undefined, undefined],
					[0b1111n, 0b1111n, 0b1111n, 0b1111n],
				),
			).toStrictEqual([0n, 0n, 0n, 0n]);
		});

		it('creates dependencies with before/after', () => {
			const systems = createMockSystems(4);
			expect(
				getSystemDependencies(
					systems,
					[
						{ before: [systems[1]] },
						{ after: [systems[2]] },
						{ after: [systems[0]] },
						{ before: [systems[0]] },
					],
					[0b1111n, 0b1111n, 0b1111n, 0b1111n],
				),
			).toStrictEqual([0b1000n, 0b0101n, 0b0001n, 0b0000n]);
		});

		it('creates dependencies with beforeAll/afterAll', () => {
			const systems = createMockSystems(4);
			expect(
				getSystemDependencies(
					systems,
					[
						{ afterAll: true },
						undefined,
						undefined,
						{ beforeAll: true },
					],
					[0b1111n, 0b1111n, 0b1111n, 0b1111n],
				),
			).toStrictEqual([0b1110n, 0b1000n, 0b1000n, 0b0000n]);
		});

		it('only creates dependencies between intersecting systems', () => {
			const systems = createMockSystems(2);
			expect(
				getSystemDependencies(
					systems,
					[{ after: [systems[1]] }, undefined],
					[0b00n, 0b00n],
				),
			).toStrictEqual([0b00n, 0b00n]);
			expect(
				getSystemDependencies(
					systems,
					[{ beforeAll: true }, undefined],
					[0b00n, 0b00n],
				),
			).toStrictEqual([0b00n, 0b00n]);
		});

		it('prioritizes explicit dependencies over implicit', () => {
			const systems = createMockSystems(3);
			expect(
				getSystemDependencies(
					systems,
					[{ afterAll: true }, { after: [systems[0]] }, undefined],
					[0b111n, 0b111n, 0b111n],
				),
			).toStrictEqual([0b100n, 0b001n, 0b000n]);
			expect(
				getSystemDependencies(
					systems,
					[undefined, { before: [systems[2]] }, { beforeAll: true }],
					[0b111n, 0b111n, 0b111n],
				),
			).toStrictEqual([0b100n, 0b000n, 0b010n]);
		});

		it('evaluates in passed order when identical implicit dependencies are provided', () => {
			const systems = createMockSystems(4);
			const beforeAll = { beforeAll: true };
			expect(
				getSystemDependencies(
					systems,
					[beforeAll, beforeAll, undefined, beforeAll],
					[0b1111n, 0b1111n, 0b1111n, 0b1111n],
				),
			).toStrictEqual([0b0000n, 0b0001n, 0b1011n, 0b0011n]);
			const afterAll = { afterAll: true };
			expect(
				getSystemDependencies(
					systems,
					[undefined, afterAll, afterAll, afterAll],
					[0b1111n, 0b1111n, 0b1111n, 0b1111n],
				),
			).toStrictEqual([0b0000n, 0b1101n, 0b1001n, 0b0001n]);
		});

		it('throws for directly contradictory dependencies', () => {
			const systems = createMockSystems(2);
			expect(() =>
				getSystemDependencies(
					systems,
					[{ after: [systems[0]] }, undefined],
					[0b11n, 0b11n],
				),
			).toThrowError();
			expect(() =>
				getSystemDependencies(
					systems,
					[{ before: [systems[1]] }, { before: [systems[0]] }],
					[0b11n, 0b11n],
				),
			).toThrowError();
			expect(() =>
				getSystemDependencies(
					systems,
					[{ after: [systems[1]] }, { after: [systems[0]] }],
					[0b11n, 0b11n],
				),
			).toThrowError();
		});
	});
}
