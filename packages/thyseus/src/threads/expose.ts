import { StructuredCloneable } from './StructuredCloneable';

type ExposedFields = Record<
	string,
	(
		...args: StructuredCloneable[]
	) => StructuredCloneable | Promise<StructuredCloneable>
>;
/**
 * A function that exposes functions to be called on a thread.
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
export function expose<T extends ExposedFields>(
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
