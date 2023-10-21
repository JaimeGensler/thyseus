import { DEV_ASSERT } from '../utils';

export type WorldConfig = {
	/**
	 * The amount to grow binary data by when it's resized for more elements.
	 *
	 * Defaults to a 2x growth factor.
	 *
	 * @param previousSize The previous size - in **elements** - of a store. This will be `0` the first time a store is grown.
	 * @returns The new size - in **elements** - the store should be.
	 */
	growStore(previousSize: number): number;

	/**
	 * When `true`, will used `SharedArrayBuffer` instead of `ArrayBuffer` when creating binary data.
	 *
	 * Use of `SharedArrayBuffer` requires a secure context.
	 *
	 * Defaults to false.
	 */
	useSharedMemory: boolean;

	/**
	 * A function that accepts the URL of a module and returns a `Worker`-like object for that module.
	 *
	 * Defaults to a browser-oriented worker creator.
	 *
	 * @param url The URL of the worker module.
	 * @returns A `Worker`-like object.
	 */
	createWorker(url: string): Worker;
};

export function getCompleteConfig(
	config?: Partial<WorldConfig> | undefined,
): WorldConfig {
	if (config?.useSharedMemory) {
		DEV_ASSERT(
			isSecureContext && typeof SharedArrayBuffer !== 'undefined',
			'Invalid config - shared memory requires a secure context and SharedArrayBuffer to be defined.',
		);
	}
	return {
		useSharedMemory: false,
		growStore(previousSize) {
			return previousSize * 2 || 4;
		},
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
	const { describe, it, expect, afterEach, vi } = import.meta.vitest;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('when using shared memory', () => {
		it('throws if isSecureContext is false', () => {
			vi.stubGlobal('isSecureContext', false);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			expect(() => getCompleteConfig({ useSharedMemory: true })).toThrow(
				/secure context/,
			);
		});

		it('throws if SharedArrayBuffer is undefined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', undefined);
			expect(() => getCompleteConfig({ useSharedMemory: true })).toThrow(
				/SharedArrayBuffer/,
			);
		});

		it('does not throw if in a secure context & SAB is defined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			expect(() =>
				getCompleteConfig({ useSharedMemory: true }),
			).not.toThrow();
		});
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('useSharedMemory');
		expect(result).toHaveProperty('growStore');
		expect(result).toHaveProperty('createWorker');
	});
}
