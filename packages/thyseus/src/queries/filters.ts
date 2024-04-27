import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

/**
 * The base class for a condition (or conditions) that entities must satisfy in
 * order to match a query.
 */
export class Filter<T extends object[] = object[]> {
	static intoArgument<T extends object[]>(
		world: World,
		...children: T
	): Filter<T> {
		return new this(world, children);
	}

	world: World;
	children: T;
	constructor(world: World, children: T) {
		this.world = world;
		this.children = children;
	}

	execute(current: bigint[]): bigint[] {
		return current;
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
> extends Filter<Class[]> {
	#_: [A, B, C, D] = true as any;
	execute(current: bigint[]): bigint[] {
		return current.map((val, i) =>
			i % 2 === 0 ? val | this.world.getArchetype(...this.children) : val,
		);
	}
}

/**
 * A predicate that ensures only entities **without** the specified components will match a query.
 */
export class Without<
	A extends object,
	B extends object = object,
	C extends object = object,
	D extends object = object,
> extends Filter<Class[]> {
	#_: [A, B, C, D] = true as any;
	execute(current: bigint[]): bigint[] {
		return current.map((val, i) =>
			i % 2 === 1
				? val | (this.world.getArchetype(...this.children) ^ 1n)
				: val,
		);
	}
}

/**
 * A connective that ensures that **all** of the provided conditions must be met for a query to match.
 */
export class And<
	A extends Filter,
	B extends Filter,
	C extends Filter = any,
	D extends Filter = any,
> extends Filter<Filter[]> {
	#_: [A, B, C, D] = true as any;
	execute(current: bigint[]): bigint[] {
		return this.children.reduce(
			(acc, filter) => filter.execute(acc),
			current,
		);
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
> extends Filter<Filter[]> {
	#_: [A, B, C, D] = true as any;
	execute(current: bigint[]): bigint[] {
		return this.children.flatMap(filter => filter.execute(current));
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

	class _EntityPlaceholder {}
	class A {}
	class B {}
	class C {}
	class D {}
	class E {}
	const components: Class[] = [_EntityPlaceholder, A, B, C, D, E];

	const world = {
		getArchetype: (...comps: Class[]) =>
			comps.reduce(
				(acc, val) => acc | (1n << BigInt(components.indexOf(val))),
				1n,
			),
	};
	const f = <T extends Class>(filterType: T, ...args: any): InstanceType<T> =>
		new filterType(world, args) as InstanceType<T>;

	describe('createArchetypeFilter()', () => {
		it('works with simple With filters', () => {
			for (let i = 0; i < components.length; i++) {
				expect(f(With, components[i]).execute([1n, 0n])).toStrictEqual([
					1n | (1n << BigInt(i)),
					0n,
				]);
			}
		});

		it('works with simple Without filters', () => {
			// Skip Entity placeholder because Without<Entity> is always invalid
			for (let i = 1; i < components.length; i++) {
				expect(
					f(Without, components[i]).execute([1n, 0n]),
				).toStrictEqual([1n, 1n << BigInt(i)]);
			}
		});

		it('works with And filter', () => {
			expect(
				f(And, f(With, A, B, D), f(Without, C, E)).execute([1n, 0n]),
			).toStrictEqual([0b010111n, 0b101000n]);
		});

		it('works with simple Or filters', () => {
			expect(
				f(Or, f(With, A), f(With, B)).execute([1n, 0n]),
			).toStrictEqual([0b000011n, 0n, 0b000101n, 0n]);

			expect(
				f(Or, f(With, E), f(Without, C)).execute([1n, 0n]),
			).toStrictEqual([0b100001n, 0n, 1n, 0b001000n]);
		});

		it('works with complex Or filters', () => {
			expect(
				// A && !B && (D || E)
				f(
					And,
					f(With, A),
					f(Or, f(With, D), f(With, E)),
					f(Without, B),
				).execute([1n, 0n]),
			).toStrictEqual([0b010011n, 0b000100n, 0b100011n, 0b000100n]);

			expect(
				f(
					// A || (B || C)
					Or,
					f(With, A),
					f(Or, f(With, B), f(With, C)),
				).execute([1n, 0n]),
			).toStrictEqual([0b0011n, 0n, 0b0101n, 0n, 0b1001n, 0n]);

			expect(
				f(
					// (A || B) && (!C || !D)
					And,
					f(Or, f(With, A), f(With, B)),
					f(Or, f(Without, C), f(Without, D)),
				).execute([1n, 0n]),
			).toStrictEqual([
				0b00011n,
				0b01000n,
				0b00101n,
				0b01000n,
				0b00011n,
				0b10000n,
				0b00101n,
				0b10000n,
			]);
		});

		it('works with initial values', () => {
			expect(
				f(And, f(With, C), f(Without, D)).execute([0b00011n, 0b00100n]),
			).toStrictEqual([0b01011n, 0b10100n]);
		});
	});

	it('throws if filters are impossible', () => {
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				f(And, f(With, A), f(Without, B)).execute([1n, 0n]),
			),
		).not.toThrow();
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				f(Or, f(With, A), f(Without, A)).execute([1n, 0n]),
			),
		).not.toThrow(/cannot match any entities/);
		expect(() =>
			DEV_ASSERT_FILTER_VALID(
				f(And, f(With, A), f(Without, A)).execute([1n, 0n]),
			),
		).toThrow(/cannot match any entities/);
	});
}
