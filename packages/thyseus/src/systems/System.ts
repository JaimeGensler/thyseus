import type { World } from '../world';

/**
 * An object - typically a class - that can be used as a parameter in a system.
 * `intoArgument` may return anything, but promises will be `await`ed.
 */
export type SystemParameter = {
	intoArgument(world: World, ...args: any[]): any;
};

/**
 * A function that accepts world data and reads or writes it.
 */
export type System = ((...args: any[]) => void | Promise<void>) & {
	getSystemArguments?(world: World): any[];
};
