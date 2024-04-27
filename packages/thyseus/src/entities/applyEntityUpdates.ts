import type { World } from '../world';
import type { Entities } from './Entities';

export function applyEntityUpdates(entities: Entities) {
	entities.update();
}
applyEntityUpdates.getSystemArguments = (world: World) => [world.entities];
