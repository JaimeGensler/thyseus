import { DEV_ASSERT } from '../utils';

export type WorldConfig = {
	getNewTableSize(prev: number): number;
	useSharedMemory: boolean;
	getWorker(url: string): Worker;
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
		getNewTableSize(prev) {
			return prev * 2 || 4;
		},
		getWorker(url) {
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
			expect(getCompleteConfig({ useSharedMemory: true })).toThrow(
				/secure context/,
			);
		});

		it('throws if SharedArrayBuffer is undefined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', undefined);
			expect(getCompleteConfig({ useSharedMemory: true })).toThrow(
				/SharedArrayBuffer/,
			);
		});

		it('does not throw if in a secure context & SAB is defined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			expect(getCompleteConfig({ useSharedMemory: true })).toThrow(
				/SharedArrayBuffer/,
			);
		});
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('useSharedMemory');
		expect(result).toHaveProperty('getNewTableSize');
		expect(result).toHaveProperty('getWorker');
	});
}
