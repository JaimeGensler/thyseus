import SystemRelationship from './SystemRelationship';
import EntityManager from '../utils/EntityManager';
import QueryParameter from './QueryParameter';
import type { WorldConfig } from '../World/config';
import type { default as Parameter, Descriptor } from './Parameter';

const type = Symbol();
export default class EntitiesParameter
	implements Parameter<EntitiesDescriptor>
{
	get type() {
		return type;
	}
	entityManager: EntityManager | null = null;

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		this.#config = config;
	}

	onBuildMainWorld(parameters: Parameter[]) {
		const qp = parameters.find(
			x => x instanceof QueryParameter,
		) as QueryParameter;

		this.entityManager = new EntityManager(
			qp.stores,
			qp.components,
			qp.queries,
		);
	}
	onBuildSystem() {
		return this.entityManager!;
	}

	// Util
	isLocalToThread() {
		return true;
	}
	getRelationship(left: EntitiesDescriptor, right: EntitiesDescriptor) {
		return SystemRelationship.Intersecting;
	}
	static createDescriptor(): EntitiesDescriptor {
		return DESCRIPTOR as any;
	}
}
const DESCRIPTOR = { type, data: null };

export interface EntitiesDescriptor {
	type: typeof type;
	data: null;
	__T: EntityManager;
}
