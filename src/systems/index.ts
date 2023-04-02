import type { World, WorldBuilder } from '../world';

export type SystemParameter = {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(worldBuilder: WorldBuilder): void;
	intoArgument(world: World): any;
};

export type System = (...args: any[]) =>
	| (void | Promise<void>)
	| {
			parameters?: SystemParameter[];
	  };
