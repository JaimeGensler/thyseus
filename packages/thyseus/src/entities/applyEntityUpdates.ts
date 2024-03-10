import { World } from '../world';

export function applyEntityUpdates(world: World) {
	world.updateEntities();
}
applyEntityUpdates.getSystemArguments = (world: World) => [world];
