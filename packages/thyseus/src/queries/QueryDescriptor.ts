import { DEV_ASSERT } from '../utils';
import { Query } from './Query';
import { Mut } from './modifiers';
import { registerFilters, createArchetypeFilter, type Filter } from './filters';
import type { World, WorldBuilder } from '../world';
import type { SystemParameter } from '../systems';
import type { Class, Struct } from '../struct';

export type AccessDescriptor = Struct | Mut<object>;
type UnwrapElement<E extends any> = E extends Class ? InstanceType<E> : E;

export class QueryDescriptor<
	A extends AccessDescriptor | AccessDescriptor[],
	F extends Filter = Filter,
> implements SystemParameter
{
	components: Struct[] = [];
	writes: boolean[] = [];
	filter: F | null;
	isIndividual: boolean;

	constructor(accessors: A | [...(A extends any[] ? A : never)], filter?: F) {
		this.isIndividual = !Array.isArray(accessors);
		const iter: AccessDescriptor[] = Array.isArray(accessors)
			? accessors
			: [accessors];

		for (const accessor of iter) {
			const isMut = accessor instanceof Mut;
			this.writes.push(isMut);
			const component = isMut ? accessor.value : accessor;
			this.components.push(component);
			DEV_ASSERT(
				component.size! > 0,
				`You may not request direct access to ZSTs - use a With filter instead (class ${component.name}).`,
			);
		}
		this.filter = filter ?? null;
	}

	isLocalToThread(): boolean {
		return false;
	}

	intersectsWith(other: unknown): boolean {
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

	onAddSystem(builder: WorldBuilder): void {
		this.components.forEach(comp => builder.registerComponent(comp));
		if (this.filter) {
			registerFilters(this.filter, comp =>
				builder.registerComponent(comp),
			);
		}
	}

	intoArgument(world: World): Query<
		A extends any[]
			? {
					[Index in keyof A]: UnwrapElement<A[Index]>;
			  }
			: UnwrapElement<A>,
		any
	> {
		const initial = world.getArchetype(...this.components);
		const query = new Query(
			this.filter
				? createArchetypeFilter(
						this.filter,
						[initial, 0n],
						(...components) => world.getArchetype(...components),
				  )
				: [initial, 0n],
			this.isIndividual,
			this.components,
			world,
		);
		world.queries.push(query);
		return query as any;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi, beforeEach } = import.meta.vitest;
	const { Memory } = await import('../utils');
	const { With, Without, Or } = await import('./filters');

	beforeEach(() => {
		Memory.init(1_000);
		return () => Memory.UNSAFE_CLEAR_ALL();
	});

	class Comp {
		static size = 1;
		static alignment = 1;
	}

	class A extends Comp {}
	class B extends Comp {}
	class C extends Comp {}
	class D extends Comp {}

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
				threads: {
					queue: (f: any) => f(),
				},
			};

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(Query);
			expect(world.queries).toContain(result);
		});
	});
}
