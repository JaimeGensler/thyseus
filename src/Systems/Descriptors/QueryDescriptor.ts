import { createFilter } from '../../utils/createFilter';
import { Mut, type Mutable } from './Mut';
import { Query } from '../../Queries';
import type { WorldBuilder } from '../../World/WorldBuilder';
import type { Descriptor } from './Descriptor';
import type { World } from '../../World';
import type { Struct } from '../../struct';

type QueryMember = Struct | Mutable<Struct>;

export class QueryDescriptor<C extends QueryMember[]> implements Descriptor {
	components: Struct[] = [];
	writes: boolean[] = [];
	constructor(components: [...C]) {
		for (const component of components) {
			const isMut = Mut.isMut<Struct>(component);
			this.components.push(isMut ? component[0] : component);
			this.writes.push(isMut);
		}
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

	intoArgument(world: World): Query<{
		[Index in keyof C]: C[Index] extends Mutable<infer X>
			? InstanceType<X>
			: Readonly<
					InstanceType<C[Index] extends Struct ? C[Index] : never>
			  >;
	}> {
		const query = new Query(
			createFilter(world.components, this.components),
			this.components,
			world.commands,
		);
		world.queries.push(query);
		return query as any;
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

			const queryABMut = new QueryDescriptor([Mut(A), Mut(B)]);
			const queryCDMut = new QueryDescriptor([Mut(C), Mut(D)]);
			expect(queryABMut.intersectsWith(queryCDMut)).toBe(false);
		});

		it('returns false for queries that readonly overlap', () => {
			const queryAB1 = new QueryDescriptor([A, B]);
			const queryAB2 = new QueryDescriptor([A, B]);

			expect(queryAB1.intersectsWith(queryAB2)).toBe(false);
		});

		it('returns true for queries that read/write overlap', () => {
			const query1 = new QueryDescriptor([Mut(A), B]);
			const query2 = new QueryDescriptor([A, D]);
			const query3 = new QueryDescriptor([C, Mut(B)]);
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

			const descriptor = new QueryDescriptor([A, Mut(B), Mut(C), D]);
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
				new QueryDescriptor([Mut(A), Mut(B), Mut(C)]).isLocalToThread(),
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
		});
	});
}
