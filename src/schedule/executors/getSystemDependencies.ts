import { DEV_ASSERT } from '../../utils/DEV_ASSERT';
import { bits } from '../../utils/bits';
import type { System } from '../../systems';
import type { SystemConfig } from '../run';

export function getSystemDependencies(
	systems: (System | SystemConfig)[],
): bigint[] {
	const masks = systems.map(() => 0n);

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
			masks[i] |= 1n << BigInt(dependencyIndex);
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
			masks[dependentIndex] |= 1n << BigInt(i);
		}
	}

	const deepDependencies = [...masks];
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

	for (let i = 0; i < systems.length; i++) {
		const system = systems[i];
		if (typeof system === 'function') {
			continue;
		}
		if (system.isFirst) {
			// beforeAll
			for (let bit = 0; bit < systems.length; bit++) {
				if (
					bit !== i &&
					(deepDependencies[i] & (1n << BigInt(bit))) === 0n
				) {
					masks[bit] |= 1n << BigInt(i);
					deepDependencies[bit] |= 1n << BigInt(i);
				}
			}
		} else if (system.isLast) {
			// afterAll
			for (let bit = 0; bit < systems.length; bit++) {
				if (
					bit !== i &&
					(deepDependencies[bit] & (1n << BigInt(i))) === 0n
				) {
					masks[i] |= 1n << BigInt(bit);
					deepDependencies[i] |= 1n << BigInt(bit);
				}
			}
		}
	}

	return masks;
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

		it('creates dependencies with beforeAll/afterAll', () => {
			const [a, b, c, d] = createMockSystems(4);
			expect(
				getSystemDependencies([run(a).last(), b, c, run(d).first()]),
			).toStrictEqual([0b1110n, 0b1000n, 0b1000n, 0b0000n]);
		});

		it('prioritizes explicit dependencies over implicit', () => {
			const [a1, b1, c1] = createMockSystems(3);

			expect(
				getSystemDependencies([run(a1).last(), run(b1).after(a1), c1]),
			).toStrictEqual([0b100n, 0b001n, 0b000n]);

			const [a2, b2, c2] = createMockSystems(3);
			expect(
				getSystemDependencies([
					a2,
					run(b2).before(c2),
					run(c2).first(),
				]),
			).toStrictEqual([0b100n, 0b000n, 0b010n]);
		});

		it('evaluates in passed order when identical implicit dependencies are provided', () => {
			const [a1, b1, c1, d1] = createMockSystems(4);
			expect(
				getSystemDependencies([
					run(a1).first(),
					run(b1).first(),
					c1,
					run(d1).first(),
				]),
			).toStrictEqual([0b0000n, 0b0001n, 0b1011n, 0b0011n]);

			const [a2, b2, c2, d2] = createMockSystems(4);
			expect(
				getSystemDependencies([
					a2,
					run(b2).last(),
					run(c2).last(),
					run(d2).last(),
				]),
			).toStrictEqual([0b0000n, 0b1101n, 0b1001n, 0b0001n]);
		});

		// Changelog v0.8 bugfix
		it('does not create circular dependencies', () => {
			const [a, b, c] = createMockSystems(3);
			expect(
				getSystemDependencies([
					run(a).before(b),
					run(b).before(c),
					run(c).first(),
				]),
			).toStrictEqual([0b000n, 0b001n, 0b010n]);
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
