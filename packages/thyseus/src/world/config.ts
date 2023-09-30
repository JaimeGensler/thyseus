import { DEV_ASSERT } from '../utils';

export type WorldConfig = {
	getNewTableSize(prev: number): number;
	useSharedMemory: boolean;
};

const getCompleteConfig = (
	config: Partial<WorldConfig> | undefined = {},
): WorldConfig => ({
	getNewTableSize: (prev: number) => prev * 2 || 4,
	useSharedMemory: false,
	...config,
});

const validateConfig = ({ useSharedMemory }: WorldConfig) => {
	if (useSharedMemory) {
		DEV_ASSERT(
			isSecureContext,
			'Invalid config - shared memory requires a secure context.',
		);
		DEV_ASSERT(
			typeof SharedArrayBuffer !== 'undefined',
			'Invalid config - shared memory requires SharedArrayBuffer.',
		);
	}
};
export function validateAndCompleteConfig(
	inConfig: Partial<WorldConfig> | undefined,
) {
	const completeConfig = getCompleteConfig(inConfig);
	validateConfig(completeConfig);
	return completeConfig;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, afterEach, vi } = import.meta.vitest;

	const validate = (config: Partial<WorldConfig>) => () =>
		validateConfig(getCompleteConfig(config));

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('when using SAB', () => {
		it('throws if isSecureContext is false', () => {
			vi.stubGlobal('isSecureContext', false);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			expect(validate({ useSharedMemory: true })).toThrow(
				/secure context/,
			);
		});

		it('throws if SharedArrayBuffer is undefined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', undefined);
			expect(validate({ useSharedMemory: true })).toThrow(
				/SharedArrayBuffer/,
			);
		});
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('useSharedMemory');
		expect(result).toHaveProperty('getNewTableSize');
	});
}
