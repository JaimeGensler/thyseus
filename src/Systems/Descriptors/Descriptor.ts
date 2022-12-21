import type { WorldBuilder } from '../../World/WorldBuilder';
import type { World } from '../../World';

export type Descriptor = {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(worldBuilder: WorldBuilder): void;
	intoArgument(world: World): any;
};
