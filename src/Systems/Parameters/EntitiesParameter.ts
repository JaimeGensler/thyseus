import SystemRelationship from '../SystemRelationship';
import EntityManager from '../../utils/EntityManager';
import QueryParameter from './QueryParameter';
import type { WorldConfig } from '../../World/config';
import type Parameter from './Parameter';

const ENTITIES_TYPE = Symbol();
export default class EntitiesParameter
	implements Parameter<EntitiesDescriptor>
{
	get type() {
		return ENTITIES_TYPE;
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
const DESCRIPTOR = { type: ENTITIES_TYPE, data: null };

export interface EntitiesDescriptor {
	type: typeof ENTITIES_TYPE;
	data: null;
	__T: EntityManager;
}
