import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

/**
 * A wrapper type for resources.
 * Resources are world-unique objects that exist for the lifetime of a world.
 */
export type Res<T extends object> = T;
export const Res = {
	async intoArgument(world: World, resource: Class): Promise<object> {
		return world.getResource(resource);
	},
};

/**
 * A wrapper type for system resources.
 * System resources are system-unique objects that exist for the lifetime of a system.
 */
export type SystemRes<T extends object> = T;
export const SystemRes = {
	async intoArgument(world: World, resourceType: Class) {
		const result = await (resourceType as any).fromWorld(world);
		DEV_ASSERT(
			result !== undefined,
			'Resource.fromWorld must return an object.',
		);
		return result;
	},
};
