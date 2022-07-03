import EntitiesParameter from './EntitiesParameter';
import QueryParameter from './QueryParameter';
import ResourceParameter from './ResourceParameter';
export { default as defineSystem, type SystemDefinition } from './defineSystem';
export { default as Mut } from './Mut';
export { default as SystemRelationship } from './SystemRelationship';

export { EntitiesParameter, QueryParameter, ResourceParameter };
export const P = {
	Entities: EntitiesParameter.createDescriptor,
	Query: QueryParameter.createDescriptor,
	Res: ResourceParameter.createDescriptor,
};

export type { default as Parameter } from './Parameter';
export type { Descriptor } from './Parameter';
