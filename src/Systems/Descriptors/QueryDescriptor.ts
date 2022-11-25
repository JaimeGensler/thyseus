import { Query, Mut, Optional, With, Without, Or, Filter } from '../../Queries';
import type { WorldBuilder } from '../../World/WorldBuilder';
import type { Descriptor } from './Descriptor';
import type { World } from '../../World';
import type { Class, Struct } from '../../struct';

const intoArray = <T>(x: T) => (Array.isArray(x) ? x : [x]);

export type AccessDescriptor =
	| Struct
	| Mut<object>
	| Optional<object>
	| Optional<Mut<object>>;

interface FilterContext {
	with: bigint[];
	without: bigint[];
	components: Struct[];
}

export class QueryDescriptor<
	A extends AccessDescriptor[],
	F extends Filter = [],
> implements Descriptor
{
	components: Struct[] = [];
	writes: boolean[] = [];
	filters: F;
	constructor(accessors: [...A], filters: F = [] as any) {
		for (const component of accessors) {
			const isMut =
				component instanceof Mut ||
				(component instanceof Optional &&
					component.value instanceof Mut);
			this.components.push(
				component instanceof Mut
					? component.value
					: component instanceof Optional
					? component.value instanceof Mut
						? component.value.value
						: component.value
					: component,
			);
			this.writes.push(isMut);
		}
		this.filters = filters;
	}

	isLocalToThread() {
		return false;
	}

	intersectsWith(other: unknown) {
		return other instanceof QueryDescriptor
			? this.components.some((compA, iA) =>
					other.components.some(
						(compB, iB) =>
							compA === compB &&
							(this.writes[iA] || other.writes[iB]),
					),
			  )
			: false;
	}

	onAddSystem(builder: WorldBuilder) {
		this.components.forEach(comp => builder.registerComponent(comp));
	}

	intoArgument(world: World): Query<
		{
			[Index in keyof A]: A[Index] extends Class
				? InstanceType<A[Index]>
				: A[Index];
		},
		F
	> {
		const query = new Query(
			...this.createFilter(world.components),
			this.components,
			world.commands,
		);
		world.queries.push(query);
		return query as any;
	}

	createFilter(allComponents: Struct[]): [bigint[], bigint[]] {
		const context: FilterContext = {
			components: allComponents,
			with: [
				this.components.reduce(
					(acc, val) =>
						acc | (1n << BigInt(allComponents.indexOf(val))),
					0n,
				),
			],
			without: [0n],
		};
		intoArray(this.filters).forEach(node =>
			this.#processFilterNode(context, node),
		);
		return [context.with, context.without];
	}

	#processFilterNode(ctx: FilterContext, filter: Filter) {
		if (filter instanceof With) {
			intoArray(filter.value).forEach(
				struct =>
					(ctx.with[ctx.with.length - 1] |=
						1n << BigInt(ctx.components.indexOf(struct)!)),
			);
		} else if (filter instanceof Without) {
			intoArray(filter.value).forEach(
				struct =>
					(ctx.without[ctx.without.length - 1] |=
						1n << BigInt(ctx.components.indexOf(struct)!)),
			);
		} else if (filter instanceof Or) {
			const currentWith = ctx.with[ctx.with.length - 1];
			const currentWithout = ctx.without[ctx.with.length - 1];
			intoArray(filter.l).forEach(lFilter =>
				this.#processFilterNode(ctx, lFilter),
			);
			ctx.with.push(currentWith);
			ctx.without.push(currentWithout);
			intoArray(filter.r).forEach(rFilter =>
				this.#processFilterNode(ctx, rFilter),
			);
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { struct } = await import('../../struct');

	class Comp {
		declare static size: number;
		declare static schema: number;
	}
	@struct()
	class A extends Comp {
		@struct.f32() declare value: number;
	}
	@struct()
	class B extends Comp {
		@struct.i64() declare value: bigint;
	}

	@struct()
	class C extends Comp {}
	@struct()
	class D extends Comp {}

	describe('intersectsWith', () => {
		it('returns false for queries that do not overlap', () => {
			const queryAB = new QueryDescriptor([A, B]);
			const queryCD = new QueryDescriptor([C, D]);
			expect(queryAB.intersectsWith(queryCD)).toBe(false);

			const queryABMut = new QueryDescriptor([new Mut(A), new Mut(B)]);
			const queryCDMut = new QueryDescriptor([new Mut(C), new Mut(D)]);
			expect(queryABMut.intersectsWith(queryCDMut)).toBe(false);
		});

		it('returns false for queries that readonly overlap', () => {
			const queryAB1 = new QueryDescriptor([A, B]);
			const queryAB2 = new QueryDescriptor([A, B]);

			expect(queryAB1.intersectsWith(queryAB2)).toBe(false);
		});

		it('returns true for queries that read/write overlap', () => {
			const query1 = new QueryDescriptor([new Mut(A), B]);
			const query2 = new QueryDescriptor([A, D]);
			const query3 = new QueryDescriptor([C, new Mut(B)]);
			expect(query1.intersectsWith(query2)).toBe(true);
			expect(query1.intersectsWith(query3)).toBe(true);
		});

		it('returns false for non-QueryDescriptors', () => {
			expect(new QueryDescriptor([]).intersectsWith({})).toBe(false);
		});
	});

	describe('onAddSystem', () => {
		it('registers all components and the query', () => {
			const registerComponent = vi.fn();
			const registerQuery = vi.fn();
			const builder: WorldBuilder = {
				registerComponent,
			} as any;

			const descriptor = new QueryDescriptor([
				A,
				new Mut(B),
				new Mut(C),
				D,
			]);
			descriptor.onAddSystem(builder);

			expect(registerComponent).toHaveBeenCalledTimes(4);
			expect(registerComponent).toHaveBeenCalledWith(A);
			expect(registerComponent).toHaveBeenCalledWith(B);
			expect(registerComponent).toHaveBeenCalledWith(C);
			expect(registerComponent).toHaveBeenCalledWith(D);
		});
	});

	describe('isLocalToThread', () => {
		it('returns false', () => {
			expect(new QueryDescriptor([A, B, C]).isLocalToThread()).toBe(
				false,
			);
			expect(
				new QueryDescriptor([
					new Mut(A),
					new Mut(B),
					new Mut(C),
				]).isLocalToThread(),
			).toBe(false);
		});
	});

	describe('intoArgument', () => {
		it('returns a query', () => {
			const descriptor = new QueryDescriptor([A, B]);
			const world: any = {
				components: [A, B],
				queries: [],
			};

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(Query);
			expect(world.queries).toContain(result);
		});
	});

	describe('createFilter', () => {
		class A {}
		class B {}
		class C {}
		class D {}
		class E {}
		const components = [A, B, C, D, E];
		const createFilter = (filter: Filter) =>
			new QueryDescriptor([], filter).createFilter(components);

		it('works with simple With filters', () => {
			for (let i = 0; i < components.length; i++) {
				expect(createFilter(new With(components[i]))).toStrictEqual([
					[1n << BigInt(i)],
					[0n],
				]);
			}
		});

		it('works with simple Without filters', () => {
			for (let i = 0; i < components.length; i++) {
				expect(createFilter(new Without(components[i]))).toStrictEqual([
					[0n],
					[1n << BigInt(i)],
				]);
			}
		});

		it('works with And filters (tuples)', () => {
			expect(
				createFilter([new With([A, B, D]), new Without([C, E])]),
			).toStrictEqual([[0b01011n], [0b10100n]]);
		});

		it('works with Or filters', () => {
			expect(
				createFilter(new Or(new With(A), new With(B))),
			).toStrictEqual([
				[0b00001n, 0b00010n],
				[0n, 0n],
			]);

			expect(
				createFilter(new Or(new With(E), new Without(C))),
			).toStrictEqual([
				[0b10000n, 0b0n],
				[0n, 0b00100n],
			]);

			expect(
				createFilter([
					new With(A),
					new Without(B),
					new Or(new With(D), new With(E)),
				]),
			).toStrictEqual([
				[0b01001n, 0b10001n],
				[0b00010n, 0b00010n],
			]);

			// FIX THIS
			expect(
				createFilter([
					new Or(new With(A), new With(B)),
					new Or(new Without(C), new Without(D)),
				]),
				// Take the current working range and split it
				// A && !C
				// B && !C
				// A && !D
				// B && !D
			).toStrictEqual([
				[0b0001n, 0b0001n, 0b0010n, 0b0010n],
				[0b0100n, 0b1000n, 0b0100n, 0b1000n],
			]);
		});

		it.todo('works with nested Or filters', () => {});
		it.todo('works with accessors');
		it.todo('validates queries');
	});
}
