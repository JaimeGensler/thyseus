import AccessType from '../../utils/AccessType';
import createFilter from '../../utils/createFilter';
import Mut, { type Mutable } from '../Mut';
import { TupleQuery, type Query } from '../../Queries';
import type WorldBuilder from '../../World/WorldBuilder';
import type Descriptor from './Descriptor';
import type { ComponentType } from '../../Components';
import type World from '../../World';

type QueryMember = ComponentType<any, any> | Mutable<ComponentType<any, any>>;

export default class QueryDescriptor<C extends QueryMember[]>
	implements Descriptor
{
	components: ComponentType<any, any>[] = [];
	accessType: AccessType[] = [];
	constructor(components: [...C]) {
		for (const component of components) {
			const isMut = Mut.isMut<ComponentType<any, any>>(component);
			this.components.push(isMut ? component[0] : component);
			this.accessType.push(isMut ? AccessType.Write : AccessType.Read);
		}
	}

	isLocalToThread() {
		return false;
	}

	intersectsWith(other: unknown) {
		//prettier-ignore
		return other instanceof QueryDescriptor
			? this.components.some((compA, iA) =>
					other.components.some((compB, iB) =>
						compA === compB &&
						(this.accessType[iA] === AccessType.Write ||
							other.accessType[iB] === AccessType.Write),
					),
			  )
			: false;
	}

	onAddSystem(builder: WorldBuilder) {
		this.components.forEach(comp => builder.registerComponent(comp));
		builder.registerQuery(this);
	}

	intoArgument(world: World): Query<{
		[Index in keyof C]: C[Index] extends Mutable<infer X>
			? InstanceType<X>
			: Readonly<
					InstanceType<
						C[Index] extends ComponentType<any, any>
							? C[Index]
							: never
					>
			  >;
	}> {
		world.queries.set(
			this,
			new TupleQuery(
				this.components,
				this.components.map(c => world.components.get(c)!),
				world.queries.get(this) as any,
				createFilter([...world.components.keys()], this.components),
			),
		);
		return world.queries.get(this)!;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { Component, Type } = await import('../../Components');

	class A extends Component({ value: Type.f32 }) {}
	class B extends Component({ value: Type.i64 }) {}
	class C extends Component({}) {}
	class D extends Component({}) {}

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
				registerQuery,
			} as any;

			const descriptor = new QueryDescriptor([A, Mut(B), Mut(C), D]);
			descriptor.onAddSystem(builder);

			expect(registerComponent).toHaveBeenCalledTimes(4);
			expect(registerComponent).toHaveBeenCalledWith(A);
			expect(registerComponent).toHaveBeenCalledWith(B);
			expect(registerComponent).toHaveBeenCalledWith(C);
			expect(registerComponent).toHaveBeenCalledWith(D);
			expect(registerQuery).toHaveBeenCalledWith(descriptor);
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
			const sparseSet = {};
			const descriptor = new QueryDescriptor([A, B]);
			const world: any = {
				components: new Map<any, any>().set(A, {}),
				queries: new Map<any, any>().set(descriptor, sparseSet),
			};

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(TupleQuery);
			expect((result as TupleQuery<any>).entities).toBe(sparseSet);
		});
	});
}
