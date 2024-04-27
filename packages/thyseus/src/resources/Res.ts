import type { Class } from '../components';
import type { World } from '../world';

/**
 * The type for a **Resource**.
 * Resources are world-unique objects that exist for the lifetime of a world.
 */
export type Res<T extends object> = T;
export const Res = {
	async intoArgument(world: World, resource: Class): Promise<object> {
		return world.getResource(resource);
	},
};
