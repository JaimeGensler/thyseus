import EntitiesParameter from './EntitiesParameter';
import QueryParameter from './QueryParameter';
import ResourceParameter from './ResourceParameter';
export type {
	default as Parameter,
	Descriptor,
	DescriptorToArgument,
} from './Parameter';

export { EntitiesParameter, QueryParameter, ResourceParameter };
export const P = {
	Entities: EntitiesParameter.createDescriptor,
	Query: QueryParameter.createDescriptor,
	Res: ResourceParameter.createDescriptor,
};
