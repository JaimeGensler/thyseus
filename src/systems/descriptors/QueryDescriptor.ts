import { DEV } from 'esm-env';
import {
	Query,
	Mut,
	Optional,
	Filter,
	With,
	Without,
	Or,
	registerFilters,
	createFilterBitfields,
} from '../../queries';
import { assert } from '../../utils/assert';
import type { World, WorldBuilder } from '../../world';
import type { Descriptor } from './Descriptor';
import type { Class, Struct } from '../../struct';

export type AccessDescriptor =
	| Struct
	| Mut<object>
	| Optional<object>
	| Optional<Mut<object>>;
type UnwrapElement<E extends any> = E extends Class ? InstanceType<E> : E;

export class QueryDescriptor<
	A extends AccessDescriptor | AccessDescriptor[],
	F extends Filter = [],
> implements Descriptor
{
	components: Struct[] = [];
	writes: boolean[] = [];
	optionals: boolean[] = [];
	filters: F;

	isIndividual: boolean;
	constructor(
		accessors: A | [...(A extends any[] ? A : never)],
		filters: F = [] as any,
	) {
		this.isIndividual = !Array.isArray(accessors);
		const iter: AccessDescriptor[] = Array.isArray(accessors)
			? accessors
			: [accessors];

		for (const accessor of iter) {
			const isMut =
				accessor instanceof Mut ||
				(accessor instanceof Optional && accessor.value instanceof Mut);
			this.writes.push(isMut);

			this.optionals.push(accessor instanceof Optional);

			const component: Struct =
				accessor instanceof Mut
					? accessor.value
					: accessor instanceof Optional
					? accessor.value instanceof Mut
						? accessor.value.value
						: accessor.value
					: accessor;
			if (DEV) {
				assert(
					component.size! > 0,
					'You may not request direct access to ZSTs - use a With filter instead.',
				);
			}
			this.components.push(component);
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
		registerFilters(builder, this.filters);
	}

	intoArgument(world: World) {
		const { withs, withouts } = createFilterBitfields(
			world.components,
			this.components,
			this.optionals,
			this.filters,
		);

		const query = new Query<
			A extends any[]
				? {
						[Index in keyof A]: UnwrapElement<A[Index]>;
				  }
				: UnwrapElement<A>,
			F
		>(withs, withouts, this.isIndividual, this.components, world);
		world.queries.push(query);
		return query;
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
	class C extends Comp {
		@struct.u8() declare value: number;
	}
	@struct()
	class D extends Comp {
		@struct.u8() declare value: number;
	}

	it('throws if trying to access ZSTs', () => {
		class ZST {
			static size = 0;
		}
		expect(() => new QueryDescriptor([ZST])).toThrow(
			/may not request direct access to ZSTs/,
		);
	});

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

		it('registers filter components', () => {
			const registerComponent = vi.fn();
			const builder: WorldBuilder = {
				registerComponent,
			} as any;
			const descriptor = new QueryDescriptor(
				[A],
				new Or(new With(B), new Without(C)),
			);
			descriptor.onAddSystem(builder);

			expect(registerComponent).toHaveBeenCalledTimes(3);
			expect(registerComponent).toHaveBeenCalledWith(A);
			expect(registerComponent).toHaveBeenCalledWith(B);
			expect(registerComponent).toHaveBeenCalledWith(C);
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
				memory: { views: {} },
			};

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(Query);
			expect(world.queries).toContain(result);
		});
	});
}
