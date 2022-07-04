import SystemRelationship from './SystemRelationship';
import Thread from '../utils/Thread';
import Mut, { type Mutable } from './Mut';
import { Component, createStore, type SchemaClass } from '../Components';
import type { default as Parameter } from './Parameter';
import type { WorldConfig } from '../World/config';
import type { Class } from '../utilTypes';
import type { SendableClass, SendableInstance } from '../utils/Thread';

const type = Symbol();
export default class ResourceParameter
	implements Parameter<ResourceDescriptor>
{
	get type() {
		return type;
	}
	#resources = new Map<AnyResource, object>();
	#nextId = 0;
	#stores: object[] = [];
	#schemaResources: SchemaClass[] = [];
	#sendableClasses: SendableClass[] = [];
	#sendableInstances: SendableInstance[] = [];

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
		this.#sendableInstances = this.#sendableClasses.map(
			SendClass => new SendClass(),
		);
	}
	onAddSystem({ data: { resource } }: ResourceDescriptor) {
		if (Component.is(resource)) {
			this.#schemaResources.push(resource);
		} else if (Thread.isSendableClass(resource)) {
			this.#sendableClasses.push(resource);
		}
	}

	extendSendable() {
		return this.#sendableClasses;
	}
	sendToThread() {
		return [this.#stores, this.#sendableInstances];
	}
	receiveOnThread([stores, instances]: [object[], SendableInstance[]]) {
		this.#stores = stores;
		for (const instance of instances) {
			//@ts-ignore: Constructor is definitely a class, not just a Function.
			this.#resources.set(instance.constructor, instance);
		}
	}

	//@ts-ignore
	onBuildSystem({ data: { resource } }: ResourceDescriptor) {
		if (
			!globalThis.document &&
			!(Component.is(resource) || Thread.isSendableClass(resource))
		) {
			return null;
		}
		if (!this.#resources.has(resource)) {
			this.#resources.set(
				resource,
				Component.is(resource)
					? new resource(this.#stores[this.#nextId++], 0)
					: //@ts-ignore
					  new resource(),
			);
		}
		return this.#resources.get(resource)!;
	}

	isLocalToThread({ data: { resource } }: ResourceDescriptor) {
		return !(Component.is(resource) || Thread.isSendableClass(resource));
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

	static createDescriptor<T extends AnyResource>(
		resource: T,
	): ResourceDescriptor<T> {
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

type AnyResource =
	| Class<object, []>
	| SchemaClass<any, any>
	| SendableClass
	| Mutable<Class | SchemaClass | SendableClass>;
export interface ResourceDescriptor<T extends AnyResource = AnyResource> {
	type: typeof type;
	data: {
		resource: AnyResource;
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
