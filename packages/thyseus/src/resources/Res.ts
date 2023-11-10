import { ReadModifier } from '../queries';
import type { Class } from '../components';
import type { World } from '../world';

export type Res<T extends object> = T;
export const Res = {
	async intoArgument(
		world: World,
		resourceOrRead: Class | ReadModifier,
	): Promise<object> {
		return world.getOrCreateResource(
			resourceOrRead instanceof ReadModifier
				? resourceOrRead.value
				: resourceOrRead,
		);
	},
};

export type SystemRes<T extends object> = T;
export const SystemRes = {
	async intoArgument(world: World, resourceType: Class) {
		return 'fromWorld' in resourceType
			? await (resourceType as any).fromWorld(world)
			: new resourceType();
	},
};
