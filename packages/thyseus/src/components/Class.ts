/**
 * Abstract type for a newable object.
 */
export type Class = {
	new (...args: any[]): object;
};
