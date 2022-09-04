import type { ResourceType } from './Resource';

export default function createResource<T extends ResourceType>(
	ResourceType: T,
): InstanceType<T> {
	//@ts-ignore
	return new ResourceType();
}
