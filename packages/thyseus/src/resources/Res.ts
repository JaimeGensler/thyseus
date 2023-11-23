import { ReadModifier } from '../queries';
import type { Class } from '../components';
import type { World } from '../world';

/**
 * A wrapper type for resources.
 * Resources are world-unique objects that exist for the lifetime of a world.
 */
export type Res<T extends object> = T;
export const Res = {
	async intoArgument(
		world: World,
		resourceOrRead: Class | ReadModifier,
	): Promise<object> {
		return world.getResource(
			resourceOrRead instanceof ReadModifier
				? resourceOrRead.value
				: resourceOrRead,
		);
	},
};

/**
 * A wrapper type for system resources.
 * System resources are system-unique objects that exist for the lifetime of a system.
 */
export type SystemRes<T extends object> = T;
export const SystemRes = {
	async intoArgument(world: World, resourceType: Class) {
		return (resourceType as any).fromWorld(world);
	},
};
