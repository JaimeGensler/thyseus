import type { World, WorldBuilder } from '../../world';

export type Descriptor = {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(worldBuilder: WorldBuilder): void;
	intoArgument(world: World): any;
};
