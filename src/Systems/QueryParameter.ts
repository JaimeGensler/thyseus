import SystemRelationship from './SystemRelationship';
import createFilter from '../utils/createFilter';
import SparseSet from '../DataTypes/SparseSet';
import Mut, { type Mutable } from './Mut';
import { createStore, type SchemaClass, type SchemaData } from '../Components';
import { TupleQuery, type Query } from '../Queries';
import type { WorldConfig } from '../World/config';
import type Parameter from './Parameter';

const QUERY_DESCRIPTOR = Symbol();
export default class QueryParameter
	implements Parameter<QueryDescriptor<any>, SentData>
{
	queries: TupleQuery<any>[] = [];
	components: SchemaClass[] = [];
	stores: SchemaData[] = [];

	#sparseSets: SparseSet[] = [];
	#count: number = 0;
	#index: number = 0;

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		this.#config = config;
	}

	onAddSystem({ data }: QueryDescriptor<[]>) {
		this.#count++;
		for (const component of data.components) {
			if (!this.components.includes(component)) {
				this.components.push(component);
			}
		}
	}

	onBuildMainWorld() {
		for (const component of this.components) {
			this.stores.push(
				createStore(component, {
					maxCount: this.#config.maxEntities,
					isShared: this.#config.threads > 1,
				}),
			);
		}

		this.#sparseSets = Array.from({ length: this.#count }, () =>
			SparseSet.with(256, this.#config.threads > 1),
		);
	}
	onBuildSystem({ data }: QueryDescriptor<[]>) {
		const query = new TupleQuery(
			data.components,
			this.stores.filter((_, i) =>
				data.components.includes(this.components[i]),
			),
			this.#sparseSets[this.#index++],
			createFilter(this.components, data.components),
		);
		this.queries.push(query);
		return query;
	}

	sendToThread(): SentData {
		return [this.#sparseSets, this.stores];
	}
	receiveOnThread([sparseSets, stores]: SentData) {
		this.#sparseSets = sparseSets;
		this.stores = stores;
	}

	recognizesDescriptor(x: object): x is QueryDescriptor<[]> {
		//@ts-ignore: x.type exists.
		return 'type' in x && x.type === QUERY_DESCRIPTOR;
	}
	isLocalToThread() {
		return false;
	}
	getRelationship(left: QueryDescriptor<[]>, right: QueryDescriptor<[]>) {
		const cmp = new Set<SchemaClass>();
		const cmpMut = new Set<SchemaClass>();

		for (let i = 0; i < left.data.components.length; i++) {
			const Component = left.data.components[i];
			const accessType = left.data.accessType[i];
			(accessType === 0 ? cmp : cmpMut).add(Component);
		}
		for (let i = 0; i < right.data.components.length; i++) {
			const Component = right.data.components[i];
			const accessType = right.data.accessType[i];
			if (
				(accessType === 0 && cmpMut.has(Component)) ||
				(accessType === 1 &&
					(cmp.has(Component) || cmpMut.has(Component)))
			) {
				return SystemRelationship.Intersecting;
			}
		}
		return SystemRelationship.Disjoint;
	}

	static createDescriptor<C extends QueryMember[]>(
		components: [...C],
	): QueryDescriptor<C> {
		return {
			type: QUERY_DESCRIPTOR,
			data: components.reduce(
				(acc, comp) => {
					const isMut = Mut.is<SchemaClass<any, any>>(comp);
					acc.components.push(isMut ? comp[0] : comp);
					acc.accessType.push(isMut ? 1 : 0);
					return acc;
				},
				{
					components: [] as SchemaClass<any, any>[],
					accessType: [] as (0 | 1)[],
				},
			),
		} as any;
	}
}

type SentData = [SparseSet[], SchemaData[]];
type QueryMember = SchemaClass<any, any> | Mutable<SchemaClass<any, any>>;
interface QueryDescriptor<T extends QueryMember[]> {
	type: typeof QUERY_DESCRIPTOR;
	data: {
		components: SchemaClass<any, any>[];
		accessType: (0 | 1)[];
	};
	__T: Query<{
		[Key in keyof T]: T[Key] extends SchemaClass<any, any>
			? Readonly<InstanceType<T[Key]>>
			: T[Key] extends Mutable<infer X>
			? X extends SchemaClass<any, any>
				? InstanceType<X>
				: never
			: never;
	}>;
}
