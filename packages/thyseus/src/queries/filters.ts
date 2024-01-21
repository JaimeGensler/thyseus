import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

/**
 * The base class for a condition that must be met for a filter to match.
 */
export class Predicate {
	static intoArgument(_: World, ...children: Class[]) {
		return new this(...children);
	}

	children: Class[];
	constructor(...children: Class[]) {
		this.children = children;
	}
}
/**
 * A predicate that ensures only entities **with** the specified components will match a query.
 */
export class With<
	A extends object,
	B extends object = object,
	C extends object = object,
	D extends object = object,
> extends Predicate {
	#_: [A, B, C, D] = true as any;
}
/**
 * A predicate that ensures only entities **without** the specified components will match a query.
 */
export class Without<
	A extends object,
	B extends object = object,
	C extends object = object,
	D extends object = object,
> extends Predicate {
	#_: [A, B, C, D] = true as any;
}

/**
 * The base class for a logical connection between filter conditions.
 */
export class Connective {
	static intoArgument(_: World, ...children: Filter[]) {
		return new this(...children);
	}

	children: Filter[];
	constructor(...children: Filter[]) {
		this.children = children;
	}
}

/**
 * A connective that ensures that **at least one** of the provided conditions must be met for a query to match.
 */
export class Or<
	A extends Filter,
	B extends Filter,
	C extends Filter = any,
	D extends Filter = any,
> extends Connective {
	#_: [A, B, C, D] = true as any;
}
/**
 * A connective that ensures that **all** of the provided conditions must be met for a query to match.
 */
export class And<
	A extends Filter,
	B extends Filter,
	C extends Filter = any,
	D extends Filter = any,
> extends Connective {
	#_: [A, B, C, D] = true as any;
}
/**
 * A combination of predicates and connectives that entities must satisfy in order to match a query.
 */
export type Filter = Predicate | Connective;

/**
 * Given a filter, returns a list of archetypes (`bigint`) that could match the filter.
 * Archetypes come in pairs of [with, without]
 * @param filter The filter to compare.
 * @param current The current state of the archetypes.
 * @param getArchetype Returns an archetype given a list of components.
 * @returns The pair of filters that must [match | not-match] for an entity to match a query.
 */
export function createArchetypeFilter(
	filter: Filter,
	current: bigint[],
	getArchetype: (...components: Class[]) => bigint,
): bigint[] {
	if (filter instanceof And) {
		return filter.children.reduce(
			(acc, val) => createArchetypeFilter(val, acc, getArchetype),
			current,
		);
	} else if (filter instanceof Or) {
		return filter.children.flatMap(val =>
			createArchetypeFilter(val, current, getArchetype),
		);
	} else {
		const remainder = filter instanceof With ? 0 : 1;
		let archetype = getArchetype(...(filter as Predicate).children);
		if (filter instanceof Without) {
			archetype ^= 1n;
		}
		return current.map((val, i) =>
			i % 2 === remainder ? val | archetype : val,
		);
	}
}
export function DEV_ASSERT_FILTER_VALID(filters: bigint[]) {
	DEV_ASSERT(
		filters.some((f, i) => i % 2 === 0 && (f & filters[i + 1]) === 0n),
		'Impossible query - cannot match any entities.',
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	class Comp {
		static size = 0;
		static alignment = 1;
	}
	class A extends Comp {}
	class B extends Comp {}
	class C extends Comp {}
	class D extends Comp {}
	class E extends Comp {}
	const components: Class[] = [A, B, C, D, E];

	const getArchetype = (...comps: Class[]) =>
		comps.reduce(
			(acc, val) => acc | (1n << BigInt(components.indexOf(val))),
			0n,
		);
	const createPlainFilter = (filter: Filter) =>
		createArchetypeFilter(filter, [0n, 0n], getArchetype);

	describe('createArchetypeFilter()', () => {
		it('works with simple With filters', () => {
			for (let i = 0; i < components.length; i++) {
				expect(
					createPlainFilter(new With(components[i])),
				).toStrictEqual([1n << BigInt(i), 0n]);
			}
		});

		it('works with simple Without filters', () => {
			for (let i = 0; i < components.length; i++) {
				expect(
					createPlainFilter(new Without(components[i])),
				).toStrictEqual([0n, 1n << BigInt(i)]);
			}
		});

		it('works with And filters (tuples)', () => {
			expect(
				createPlainFilter(
					new And(new With(A, B, D), new Without(C, E)),
				),
			).toStrictEqual([0b01011n, 0b10100n]);
		});

		it('works with simple Or filters', () => {
			expect(
				createPlainFilter(new Or(new With(A), new With(B))),
			).toStrictEqual([0b00001n, 0n, 0b00010n, 0n]);

			expect(
				createPlainFilter(new Or(new With(E), new Without(C))),
			).toStrictEqual([0b10000n, 0n, 0b0n, 0b00100n]);
		});

		it('works with complex Or filters', () => {
			expect(
				createPlainFilter(
					// A && !B && (D || E)
					new And(
						new With(A),
						new Or(new With(D), new With(E)),
						new Without(B),
					),
				),
			).toStrictEqual([0b01001n, 0b00010n, 0b10001n, 0b00010n]);

			expect(
				createPlainFilter(
					// A || (B || C)
					new Or(new With(A), new Or(new With(B), new With(C))),
				),
			).toStrictEqual([0b001n, 0n, 0b010n, 0n, 0b100n, 0n]);

			expect(
				createPlainFilter(
					// (A || B) && (!C || !D)
					new And(
						new Or(new With(A), new With(B)),
						new Or(new Without(C), new Without(D)),
					),
				),
			).toStrictEqual([
				0b0001n,
				0b0100n,
				0b0010n,
				0b0100n,
				0b0001n,
				0b1000n,
				0b0010n,
				0b1000n,
			]);
		});

		it('works with initial values', () => {
			expect(
				createArchetypeFilter(
					new And(new With(C), new Without(D)),
					[0b0001n, 0b0010n],
					getArchetype,
				),
			).toStrictEqual([0b0101n, 0b1010n]);
		});
	});

	it('throws if filters are impossible', () => {
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				createPlainFilter(new And(new With(A), new Without(B))),
			),
		).not.toThrow();
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				createPlainFilter(new Or(new With(A), new Without(A))),
			),
		).not.toThrow(/cannot match any entities/);
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				createPlainFilter(new And(new With(A), new Without(A))),
			),
		).toThrow(/cannot match any entities/);
	});
}
