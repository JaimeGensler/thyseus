import SystemRelationship from './SystemRelationship';
import createFilter from '../utils/createFilter';
import SparseSet from '../DataTypes/SparseSet';
import Mut, { type Mutable } from './Mut';
import { createStore, type SchemaClass, type SchemaData } from '../Components';
import { TupleQuery, type Query } from '../Queries';
import type { WorldConfig } from '../World/config';
import type Parameter from './Parameter';
import AccessType from '../utils/AccessType';

const type = Symbol();
export default class QueryParameter implements Parameter<QueryDescriptor<any>> {
	get type() {
		return type;
	}

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

	sendToThread() {
		return [this.#sparseSets, this.stores];
	}
	receiveOnThread([sparseSets, stores]: [SparseSet[], SchemaData[]]) {
		this.#sparseSets = sparseSets;
		this.stores = stores;
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
			(accessType === AccessType.Read ? cmp : cmpMut).add(Component);
		}
		for (let i = 0; i < right.data.components.length; i++) {
			const Component = right.data.components[i];
			const accessType = right.data.accessType[i];
			if (
				(accessType === AccessType.Read && cmpMut.has(Component)) ||
				(accessType === AccessType.Write &&
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
			type,
			data: components.reduce(
				(acc, comp) => {
					const isMut = Mut.is<SchemaClass<any, any>>(comp);
					acc.components.push(isMut ? comp[0] : comp);
					acc.accessType.push(
						isMut ? AccessType.Write : AccessType.Read,
					);
					return acc;
				},
				{
					components: [] as SchemaClass<any, any>[],
					accessType: [] as AccessType[],
				},
			),
		} as any;
	}
}

type QueryMember = SchemaClass<any, any> | Mutable<SchemaClass<any, any>>;
interface QueryDescriptor<T extends QueryMember[]> {
	type: typeof type;
	data: {
		components: SchemaClass<any, any>[];
		accessType: AccessType[];
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
