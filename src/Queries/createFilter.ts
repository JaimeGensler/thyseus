import { Struct } from '../struct';
import { assert } from '../utils/assert';
import { Filter, Or, With, Without } from './modifiers';

export function createFilter(
	allComponents: Struct[],
	components: Struct[],
	filters: Filter,
): [bigint[], bigint[]] {
	const result = processFilterArray(filters, allComponents, [
		[intoBigint(allComponents, components)],
		[0n],
	]);

	const toKeep = result[0].reduce(
		(acc, _, i) =>
			(result[0][i] & result[1][i]) === 0n ? acc.add(i) : acc,
		new Set<number>(),
	);
	result[0] = result[0].filter((_, i) => toKeep.has(i));
	result[1] = result[1].filter((_, i) => toKeep.has(i));
	assert(
		result[0].length > 0,
		'Tried to construct a query that cannot match any entities.',
	);
	return result;
}

const intoBigint = (allComponents: Struct[], components: Struct | Struct[]) =>
	[components]
		.flat()
		.reduce(
			(acc, val) => acc | (1n << BigInt(allComponents.indexOf(val))),
			0n,
		);

const processFilterArray = (
	filters: Filter,
	allComponents: Struct[],
	data: [bigint[], bigint[]],
) =>
	[filters]
		.flat()
		.reduce(
			(acc, node) => processFilterNode(acc, allComponents, node),
			data,
		);

const processFilterNode = (
	data: [bigint[], bigint[]],
	allComponents: Struct[],
	filter: Filter,
): [bigint[], bigint[]] => {
	if (filter instanceof With) {
		const apply = intoBigint(allComponents, filter.value);
		return [data[0].map(val => val | apply), data[1]];
	} else if (filter instanceof Without) {
		const apply = intoBigint(allComponents, filter.value);
		return [data[0], data[1].map(val => val | apply)];
	} else if (filter instanceof Or) {
		const [withL, withoutL] = processFilterArray(
			filter.l,
			allComponents,
			data,
		);
		const [withR, withoutR] = processFilterArray(
			filter.r,
			allComponents,
			data,
		);
		return [
			[...withL, ...withR],
			[...withoutL, ...withoutR],
		];
	}
	throw new Error(
		`Unrecognized filter (${filter.constructor.name}) in Query.`,
	);
};

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	class Comp {
		static size = 1;
	}
	class A extends Comp {}
	class B extends Comp {}
	class C extends Comp {}
	class D extends Comp {}
	class E extends Comp {}
	const components = [A, B, C, D, E];
	const testCreateFilter = (filter: Filter) =>
		createFilter(components, [], filter);
	it('works with simple With filters', () => {
		for (let i = 0; i < components.length; i++) {
			expect(testCreateFilter(new With(components[i]))).toStrictEqual([
				[1n << BigInt(i)],
				[0n],
			]);
		}
	});

	it('works with simple Without filters', () => {
		for (let i = 0; i < components.length; i++) {
			expect(testCreateFilter(new Without(components[i]))).toStrictEqual([
				[0n],
				[1n << BigInt(i)],
			]);
		}
	});

	it('works with And filters (tuples)', () => {
		expect(
			testCreateFilter([new With([A, B, D]), new Without([C, E])]),
		).toStrictEqual([[0b01011n], [0b10100n]]);
	});

	it('works with simple Or filters', () => {
		expect(
			testCreateFilter(new Or(new With(A), new With(B))),
		).toStrictEqual([
			[0b00001n, 0b00010n],
			[0n, 0n],
		]);

		expect(
			testCreateFilter(new Or(new With(E), new Without(C))),
		).toStrictEqual([
			[0b10000n, 0b0n],
			[0n, 0b00100n],
		]);
	});

	it('works with complex Or filters', () => {
		expect(
			testCreateFilter([
				// A && !B && (D || E)
				new With(A),
				new Or(new With(D), new With(E)),
				new Without(B),
			]),
		).toStrictEqual([
			[0b01001n, 0b10001n],
			[0b00010n, 0b00010n],
		]);

		expect(
			testCreateFilter(
				// A || (B || C)
				new Or(new With(A), new Or(new With(B), new With(C))),
			),
		).toStrictEqual([
			[0b001n, 0b010n, 0b100n],
			[0n, 0n, 0n],
		]);

		expect(
			testCreateFilter([
				// (A || B) && (!C || !D)
				new Or(new With(A), new With(B)),
				new Or(new Without(C), new Without(D)),
			]),
		).toStrictEqual([
			[0b0001n, 0b0010n, 0b0001n, 0b0010n],
			[0b0100n, 0b0100n, 0b1000n, 0b1000n],
		]);
	});

	it('works with accessors', () => {
		expect(
			createFilter(components, [A, B], [new Without(C), new With(D)]),
		).toStrictEqual([[0b1011n], [0b0100n]]);
	});

	it('simplifies queries', () => {
		expect(
			testCreateFilter([
				// (A || B) && (!A || !B)
				// Filter expands into:
				// A && !A (removed)
				// A && !B
				// B && !A
				// B && !B (removed)
				new Or(new With(A), new With(B)),
				new Or(new Without(A), new Without(B)),
			]),
		).toStrictEqual([
			[0b10n, 0b01n],
			[0b01n, 0b10n],
		]);
	});
	it('throws if simplification leaves no filters', () => {
		expect(() => testCreateFilter([new With(A), new Without(A)])).toThrow(
			/cannot match any entities/,
		);
	});

	it('throws for unrecognized filters', () => {
		class NotAFilter {}
		expect(() => testCreateFilter([new NotAFilter() as any])).toThrow(
			/unrecognized filter \(NotAFilter\)/i,
		);
	});
}
