import { DEV_ASSERT } from '../utils';
import type { Class } from '../components';
import type { World } from '../world';

/**
 * A type for data local (and unique) to a system.
 */
export type Local<T extends object> = T;
export const Local = {
	async intoArgument(world: World, resourceType: Class) {
		const result =
			'fromWorld' in resourceType
				? await (resourceType as any).fromWorld(world)
				: new resourceType();
		DEV_ASSERT(
			result !== undefined,
			'Resource.fromWorld must return an object.',
		);
		return result;
	},
};
