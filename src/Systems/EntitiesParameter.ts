import SystemRelationship from './SystemRelationship';
import EntityManager from '../utils/EntityManager';
import QueryParameter from './QueryParameter';
import type { WorldConfig } from '../World/config';
import type { default as Parameter, Descriptor } from './Parameter';

const ENTITIES_DESCRIPTOR = Symbol();
export default class EntitiesParameter
	implements Parameter<EntitiesDescriptor>
{
	entityManager: EntityManager | null = null;

	#config: WorldConfig;
	constructor(config: WorldConfig) {
		this.#config = config;
	}

	onAddSystem({ data }: EntitiesDescriptor) {}
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
	recognizesDescriptor(x: Descriptor): x is EntitiesDescriptor {
		return x.type === ENTITIES_DESCRIPTOR;
	}
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
const DESCRIPTOR = {
	type: ENTITIES_DESCRIPTOR,
	data: null,
};

export interface EntitiesDescriptor {
	type: typeof ENTITIES_DESCRIPTOR;
	data: null;
	__T: EntityManager;
}
