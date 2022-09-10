import type { WorldConfig } from '../World/config';
import type { ResourceType } from './Resource';

export default function createResource<T extends ResourceType>(
	Resource: T,
	config: WorldConfig,
): InstanceType<T> {
	return isCreateableResource(Resource)
		? Resource.create(config)
		: (new Resource() as any);
}

function isCreateableResource<T extends ResourceType>(
	value: T,
): value is T & { create(config: WorldConfig): InstanceType<T> } {
	return 'create' in value && typeof value['create'] === 'function';
}
