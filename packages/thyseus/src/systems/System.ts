import type { World } from '../world';

export type SystemParameter = {
	intoArgument(world: World, ...args: any[]): any;
};

/**
 * A function that accepts world data and reads or writes it.
 */
export type System = ((...args: any[]) => void | Promise<void>) & {
	getSystemArguments?(world: World): any[];
};
