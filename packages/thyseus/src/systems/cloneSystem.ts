import { System } from './System';

/**
 * Clones a system.
 *
 * Note: **Does not** preserve your system's `this` value.
 *
 * @param system The system to clone.
 * @returns The cloned system.
 */
export function cloneSystem<T extends System>(system: T): T {
	const clone = system.bind(null) as T;
	clone.parameters = system.parameters!;
	return clone;
}
