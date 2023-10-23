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
};

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
