import type { Struct } from '../components';
import { DEV_ASSERT } from '../utils';

export class Predicate {
	children: Struct[];
	constructor(...children: Struct[]) {
		this.children = children;
	}
}
export class With<
	A extends object,
	B extends object = object,
	C extends object = object,
	D extends object = object,
> extends Predicate {
	#_: [A, B, C, D] = true as any;
}
export class Without<
	A extends object,
	B extends object = object,
	C extends object = object,
	D extends object = object,
> extends Predicate {
	#_: [A, B, C, D] = true as any;
}

export class Connective {
	children: Filter[];
	constructor(...children: Filter[]) {
		this.children = children;
	}
}
export class Or<
	A extends Filter,
	B extends Filter,
	C extends Filter = any,
	D extends Filter = any,
> extends Connective {
	#_: [A, B, C, D] = true as any;
}
export class And<
	A extends Filter,
	B extends Filter,
	C extends Filter = any,
	D extends Filter = any,
> extends Connective {
	#_: [A, B, C, D] = true as any;
}
export type Filter = Predicate | Connective;

export function registerFilters(
	filter: Filter,
	register: (instance: Struct) => void,
) {
	if (filter instanceof Connective) {
		filter.children.forEach(child => registerFilters(child, register));
	} else {
		filter.children.forEach(register);
	}
}

export function createArchetypeFilter(
	filter: Filter,
	current: bigint[],
	getArchetype: (...components: Struct[]) => bigint,
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
		const archetype = getArchetype(...(filter as Predicate).children);
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
	const components: Struct[] = [A, B, C, D, E];

	const getArchetype = (...comps: Struct[]) =>
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
