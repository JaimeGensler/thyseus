import { World } from './World';

/**
 * A function that takes a world and may add event listeners, systems, and data to it.
 */
export type Plugin =
	| ((world: World) => Promise<void>)
	| ((world: World) => void);
