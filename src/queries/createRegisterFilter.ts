import { DEV } from 'esm-env';
import { Or, With, Without, type Filter } from './modifiers';
import { assert } from '../utils/assert';
import type { Struct } from '../struct';
import type { WorldBuilder } from '../world';

const getBitfieldForComponentSet = (
	allComponents: Struct[],
	components: Struct | Struct[],
	optionals: boolean[] = [],
) =>
	(Array.isArray(components) ? components : [components]).reduce(
		(acc, val, i) =>
			optionals[i]
				? acc
				: acc | (1n << BigInt(allComponents.indexOf(val))),
		0n,
	);

type Visitor<T> = (accumulator: T, val: Filter) => T;
function visitQueryFilters(filters: Filter, visitor: Visitor<void>): void;
function visitQueryFilters<T>(
	filters: Filter,
	visitor: Visitor<T>,
	initialValue: T,
): T;
function visitQueryFilters<T>(
	filters: Filter,
	visitor: Visitor<T>,
	initialValue?: T,
): T {
	let currentValue = initialValue as T;
	for (const filter of Array.isArray(filters) ? filters : [filters]) {
		currentValue = visitor(currentValue, filter);
	}
	return currentValue;
}

export function registerFilters(builder: WorldBuilder, filters: Filter) {
	visitQueryFilters(filters, function visitor(_: void, f: Filter) {
		if (f instanceof With || f instanceof Without) {
			const comps = f.value instanceof Array ? f.value : [f.value];
			comps.forEach(comp => builder.registerComponent(comp));
		} else if (f instanceof Or) {
			visitQueryFilters(f.l, visitor);
			visitQueryFilters(f.r, visitor);
		}
	});
}
export function createFilterBitfields(
	allComponents: Struct[],
	accessors: Struct[],
	optionals: boolean[],
	filters: Filter,
) {
	const result = visitQueryFilters(
		filters,
		function visitor(acc, filter): any {
			if (filter instanceof With) {
				const apply = getBitfieldForComponentSet(
					allComponents,
					filter.value,
				);
				return {
					withs: acc.withs.map(e => e | apply),
					withouts: acc.withouts,
				};
			} else if (filter instanceof Without) {
				const apply = getBitfieldForComponentSet(
					allComponents,
					filter.value,
				);
				return {
					withs: acc.withs,
					withouts: acc.withouts.map(e => e | apply),
				};
			} else if (filter instanceof Or) {
				const l = visitQueryFilters(filter.l, visitor, acc);
				const r = visitQueryFilters(filter.r, visitor, acc);
				return {
					withs: [...l.withs, ...r.withs],
					withouts: [...l.withouts, ...r.withouts],
				};
			}
			throw new Error(
				`Unrecognized filter (${filter.constructor.name}) in Query.`,
			);
		},
		{
			withs: [
				getBitfieldForComponentSet(allComponents, accessors, optionals),
			],
			withouts: [0n],
		},
	);
	const toKeep = result.withs.reduce(
		(acc, _, i) =>
			(result.withs[i] & result.withouts[i]) === 0n ? acc.add(i) : acc,
		new Set<number>(),
	);
	result.withs = result.withs.filter((_, i) => toKeep.has(i));
	result.withouts = result.withouts.filter((_, i) => toKeep.has(i));
	if (DEV) {
		assert(
			result.withs.length > 0,
			'Tried to construct a query that cannot match any entities.',
		);
	}
	return result;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { With, Without, Or } = await import('./modifiers');

	class Comp {
		static size = 1;
	}
	class A extends Comp {}
	class B extends Comp {}
	class C extends Comp {}
	class D extends Comp {}
	class E extends Comp {}
	const components = [A, B, C, D, E];

	const createPlainFilter = (filters: Filter) =>
		createFilterBitfields(components, [], [], filters);

	it('works with simple With filters', () => {
		for (let i = 0; i < components.length; i++) {
			expect(createPlainFilter(new With(components[i]))).toStrictEqual({
				withs: [1n << BigInt(i)],
				withouts: [0n],
			});
		}
	});

	it('works with simple Without filters', () => {
		for (let i = 0; i < components.length; i++) {
			expect(createPlainFilter(new Without(components[i]))).toStrictEqual(
				{ withs: [0n], withouts: [1n << BigInt(i)] },
			);
		}
	});

	it('works with And filters (tuples)', () => {
		expect(
			createPlainFilter([new With([A, B, D]), new Without([C, E])]),
		).toStrictEqual({ withs: [0b01011n], withouts: [0b10100n] });
	});

	it('works with simple Or filters', () => {
		expect(
			createPlainFilter(new Or(new With(A), new With(B))),
		).toStrictEqual({
			withs: [0b00001n, 0b00010n],
			withouts: [0n, 0n],
		});

		expect(
			createPlainFilter(new Or(new With(E), new Without(C))),
		).toStrictEqual({
			withs: [0b10000n, 0b0n],
			withouts: [0n, 0b00100n],
		});
	});

	it('works with complex Or filters', () => {
		expect(
			createPlainFilter([
				// A && !B && (D || E)
				new With(A),
				new Or(new With(D), new With(E)),
				new Without(B),
			]),
		).toStrictEqual({
			withs: [0b01001n, 0b10001n],
			withouts: [0b00010n, 0b00010n],
		});

		expect(
			createPlainFilter(
				// A || (B || C)
				new Or(new With(A), new Or(new With(B), new With(C))),
			),
		).toStrictEqual({
			withs: [0b001n, 0b010n, 0b100n],
			withouts: [0n, 0n, 0n],
		});

		expect(
			createPlainFilter([
				// (A || B) && (!C || !D)
				new Or(new With(A), new With(B)),
				new Or(new Without(C), new Without(D)),
			]),
		).toStrictEqual({
			withs: [0b0001n, 0b0010n, 0b0001n, 0b0010n],
			withouts: [0b0100n, 0b0100n, 0b1000n, 0b1000n],
		});
	});

	it('works with normal accessors', () => {
		expect(
			createFilterBitfields(
				components,
				[A, B],
				[],
				[new Without(C), new With(D)],
			),
		).toStrictEqual({ withs: [0b1011n], withouts: [0b0100n] });
	});

	it('allows optional access', () => {
		expect(
			createFilterBitfields(
				components,
				[A, B, C],
				[true, false, true],
				[],
			),
			// A & C aren't required!
		).toStrictEqual({ withs: [0b010n], withouts: [0b000n] });
	});

	it('simplifies queries', () => {
		expect(
			createPlainFilter([
				// (A || B) && (!A || !B)
				// Filter expands into:
				// A && !A (removed)
				// A && !B
				// B && !A
				// B && !B (removed)
				new Or(new With(A), new With(B)),
				new Or(new Without(A), new Without(B)),
			]),
		).toStrictEqual({
			withs: [0b10n, 0b01n],
			withouts: [0b01n, 0b10n],
		});
	});
	it('throws if simplification leaves no filters', () => {
		expect(() => createPlainFilter([new With(A), new Without(A)])).toThrow(
			/cannot match any entities/,
		);
	});

	it('throws for unrecognized filters', () => {
		class NotAFilter {}
		expect(() => createPlainFilter([new NotAFilter() as any])).toThrow(
			/unrecognized filter \(NotAFilter\)/i,
		);
	});
}
