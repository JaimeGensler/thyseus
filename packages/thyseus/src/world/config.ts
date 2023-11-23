/**
 * Configuration used by a `World`.
 * May be accessed by resources or other data in a world.
 */
export type WorldConfig = {
	/**
	 * A function that accepts the URL of a module and returns a `Worker`-like object for that module.
	 *
	 * Defaults to a module-friendly browser-oriented worker creation function.
	 *
	 * @param url The URL of the worker module.
	 * @returns A `Worker`-like object.
	 */
	createWorker(url: string): Worker;
} & Record<string, unknown>;

/**
 * Completes the config for a world.
 * @param config The partial config for the world.
 * @returns The completed config.
 */
export function getCompleteConfig(
	config?: Partial<WorldConfig> | undefined,
): WorldConfig {
	return {
		createWorker(url) {
			return new Worker(url, { type: 'module' });
		},
		...config,
	};
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, afterEach, vi } = import.meta.vitest;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('createWorker');
	});
}
