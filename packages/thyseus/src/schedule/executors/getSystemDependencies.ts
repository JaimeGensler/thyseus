import { bits, DEV_ASSERT } from '../../utils';
import type { System } from '../../systems';
import type { SystemConfig } from '../run';

export function getSystemDependencies(
	systems: (System | SystemConfig)[],
): bigint[] {
	const dependencies = systems.map(() => 0n);

	for (let i = 0; i < systems.length; i++) {
		const system = systems[i];
		if (typeof system === 'function') {
			continue;
		}
		for (const dependency of system.dependencies) {
			const dependencyIndex = systems.findIndex(s =>
				typeof s === 'function'
					? s === dependency
					: s.system === dependency,
			);
			DEV_ASSERT(
				dependencyIndex !== -1,
				`System "${system.system.name}" must run after system "${dependency.name}", but "${dependency.name}" is not in the schedule!`,
			);
			dependencies[i] |= 1n << BigInt(dependencyIndex);
		}
		for (const dependent of system.dependents) {
			const dependentIndex = systems.findIndex(s =>
				typeof s === 'function'
					? s === dependent
					: s.system === dependent,
			);
			DEV_ASSERT(
				dependentIndex !== -1,
				`System "${system.system.name}" must run before "${dependent.name}", but "${dependent.name}" is not in the schedule!`,
			);
			dependencies[dependentIndex] |= 1n << BigInt(i);
		}
	}

	const deepDependencies = [...dependencies];
	deepDependencies.forEach(function mergeDependencies(mask, i) {
		for (const bit of bits(mask)) {
			mergeDependencies(deepDependencies[bit], bit);
			deepDependencies[i] |= deepDependencies[bit];
		}
	});

	for (let i = 0; i < deepDependencies.length; i++) {
		const system = systems[i];
		DEV_ASSERT(
			(deepDependencies[i] & (1n << BigInt(i))) === 0n,
			`Circular dependency detected - sytem "${
				typeof system === 'function' ? system.name : system.system.name
			}" depends on itself!`,
		);
	}

	return dependencies;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { run } = await import('../run');

	const createMockSystems = (length: number): System[] =>
		Array.from({ length }, () => () => {});

	describe('getSystemDependencies', () => {
		it('returns a 0n array if no dependencies are specified', () => {
			expect(getSystemDependencies(createMockSystems(4))).toStrictEqual([
				0n,
				0n,
				0n,
				0n,
			]);
		});

		it('creates dependencies with before/after', () => {
			const [a, b, c, d] = createMockSystems(4);
			expect(
				getSystemDependencies([
					run(a).before(b),
					run(b).after(c),
					run(c).after(a),
					run(d).before(a),
				]),
			).toStrictEqual([0b1000n, 0b0101n, 0b0001n, 0b0000n]);
		});

		it('throws for directly contradictory dependencies', () => {
			const [a, b] = createMockSystems(2);
			expect(() =>
				getSystemDependencies([run(a).before(a), b]),
			).toThrowError();

			const [c, d] = createMockSystems(2);
			expect(() =>
				getSystemDependencies([run(c).before(d), run(d).before(c)]),
			).toThrowError();

			const [e, f] = createMockSystems(2);
			expect(() =>
				getSystemDependencies([run(e).after(f), run(f).after(e)]),
			).toThrowError();

			const [g, h, i] = createMockSystems(3);
			expect(() =>
				getSystemDependencies([
					run(g).before(h),
					run(h).before(i),
					run(i).before(g),
				]),
			).toThrowError();
		});
	});
}
