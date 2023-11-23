import type { World } from '../world';

/**
 * An object that can be used as a parameter in an ECS system.
 * Typically a class, but the `intoArgument` is permitted to return anything.
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
