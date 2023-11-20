export type Exposeable = Record<string, (...args: any[]) => any>;

/**
 * A function that exposes functions to be called on a thread.
 *
 * @param fields The fields to expose to the main thread.
 * @param shouldSetup A boolean that indicates whether event handlers should be orchestrated.
 * @returns The provided `fields` object.
 *
 * @example
 * ```ts
 * // In a worker module
 * export default expose({
 * 	add(left: number, right: number) {
 * 		return left + right;
 * 	}
 * });
 * ```
 */
export function expose<T extends Exposeable>(
	fields: T,
	shouldSetup: boolean = true,
): T {
	if (shouldSetup) {
		globalThis.addEventListener('message', async ({ data }) => {
			const { key, value, id } = data;
			const result = await fields[key](...value);
			globalThis.postMessage({ id, result });
		});
	}
	return fields;
}
