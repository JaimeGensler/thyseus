import SystemRelationship from './SystemRelationship';
import Mut, { type Mutable } from './Mut';
import { createStore, type SchemaClass } from '../Components';
import type { default as Parameter, Descriptor } from './Parameter';
import type { WorldConfig } from '../World/config';
import type { Class } from '../utilTypes';

const type = Symbol();
export default class ResourceParameter
	implements Parameter<ResourceDescriptor, object[]>
{
	get type() {
		return type;
	}
	#resources = new Map<Class, object>();
	#nextId = 0;
	#stores: object[] = [];
	#schemaResources: SchemaClass[] = [];

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		this.#config = config;
	}

	onBuildMainWorld() {
		this.#stores = this.#schemaResources.map(r =>
			createStore(r, {
				maxCount: 1,
				isShared: this.#config.threads > 1,
			}),
		);
	}
	onAddSystem({ data: { resource } }: ResourceDescriptor) {
		if (isSchemaClass(resource)) {
			this.#schemaResources.push(resource);
		}
	}
	sendToThread() {
		return this.#stores;
	}
	receiveOnThread(stores: object[]) {
		this.#stores = stores;
	}

	//@ts-ignore
	onBuildSystem({ data: { resource } }: ResourceDescriptor) {
		if (!globalThis.document && !isSchemaClass(resource)) return null;
		if (!this.#resources.has(resource)) {
			this.#resources.set(
				resource,
				isSchemaClass(resource)
					? new resource(this.#stores[this.#nextId++], 0)
					: //@ts-ignore
					  new resource(),
			);
		}
		return this.#resources.get(resource)!;
	}

	isLocalToThread({ data: { resource } }: ResourceDescriptor) {
		return !isSchemaClass(resource);
	}
	getRelationship(left: ResourceDescriptor, right: ResourceDescriptor) {
		if (
			left.data.resource !== right.data.resource ||
			(left.data.accessType === 0 && right.data.accessType === 0)
		) {
			return SystemRelationship.Disjoint;
		}
		return SystemRelationship.Intersecting;
	}

	static createDescriptor<
		T extends Class | SchemaClass<any, any> | Mutable<any>,
	>(resource: T): ResourceDescriptor<T> {
		const isMut = Mut.is<Class | SchemaClass>(resource);
		return {
			type,
			data: {
				resource: isMut ? resource[0] : (resource as Class),
				accessType: isMut ? 1 : 0,
			},
		} as any;
	}
}

function isSchemaClass(val: unknown): val is SchemaClass {
	return typeof val === 'function' && 'schema' in val;
}

type AnyResource = Class | SchemaClass<any, any> | Mutable<Class | SchemaClass>;
export interface ResourceDescriptor<T extends AnyResource = AnyResource> {
	type: typeof type;
	data: {
		resource: Class | SchemaClass<any, any>;
		accessType: 0 | 1;
	};
	__T: T extends Mutable<infer X>
		? InstanceType<X>
		: T extends Class<infer X>
		? Readonly<X>
		: T extends SchemaClass<any, any>
		? Readonly<InstanceType<T>>
		: never;
}
