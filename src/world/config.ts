import { DEV } from 'esm-env';
import { assert } from '../utils/assert';

export type WorldConfig = {
	threads: number;
	getNewTableSize(prev: number): number;
	memory: number;
};
export type SingleThreadedWorldConfig = WorldConfig & {
	threads: 1;
};

const MB = 1_048_576;

const getCompleteConfig = (config: Partial<WorldConfig> | undefined = {}) => ({
	threads: 1,
	memory: 512 * MB,
	getNewTableSize: (prev: number) => (prev === 0 ? 8 : prev * 2),
	...config,
});

const validateConfig = (
	{ threads, memory }: WorldConfig,
	url: string | URL | undefined,
) => {
	if (threads > 1) {
		assert(
			isSecureContext,
			'Invalid config - Multithreading (threads > 1) requires a secure context.',
		);
		assert(
			typeof SharedArrayBuffer !== 'undefined',
			'Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer.',
		);
		assert(
			url,
			'Invalid config - Multithreading (threads > 1) requires a module URL parameter.',
			TypeError,
		);
	}
	assert(
		Number.isInteger(threads) && 0 < threads && threads < 64,
		"Invalid config - 'threads' must be an integer such that 0 < threads < 64",
		RangeError,
	);
	assert(
		Number.isInteger(memory) && memory < 2 ** 32,
		"Invalid config - 'memory' must be at most 4 GB ((2**32) - 1 bytes)",
	);
};
export function validateAndCompleteConfig(
	inConfig: Partial<WorldConfig> | undefined,
	url: string | URL | undefined,
) {
	const completeConfig = getCompleteConfig(inConfig);
	if (DEV) {
		validateConfig(completeConfig, url);
	}
	return completeConfig;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, afterEach, vi } = import.meta.vitest;

	const validate =
		(config: Partial<WorldConfig>, url?: string | undefined) => () =>
			validateConfig(getCompleteConfig(config), url);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('when threads > 1', () => {
		it('throws if isSecureContext is false', () => {
			vi.stubGlobal('isSecureContext', false);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			expect(validate({ threads: 2 }, '/')).toThrow(/secure context/);
		});

		it('throws if SharedArrayBuffer is undefined', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', undefined);
			expect(validate({ threads: 2 }, '/')).toThrow(/SharedArrayBuffer/);
		});

		it('throws if a falsy module URL is provided', () => {
			vi.stubGlobal('isSecureContext', true);
			vi.stubGlobal('SharedArrayBuffer', ArrayBuffer);
			const expectedError = /module URL/;
			expect(validate({ threads: 2 }, '')).toThrow(expectedError);
			expect(validate({ threads: 2 }, undefined)).toThrow(expectedError);
		});
	});

	it('throws if threads < 1 or threads > 64, or not a safe, positive integer', () => {
		expect(validate({ threads: 0 }, '/')).toThrow(
			/'threads' must be an integer/,
		);
		expect(validate({ threads: 1.2 }, '/')).toThrow(
			/'threads' must be an integer/,
		);
		expect(validate({ threads: 64 }, '/')).toThrow(
			/'threads' must be an integer/,
		);
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('threads');
		expect(result.threads).toBe(1);

		const result2 = getCompleteConfig({ threads: 2 });
		expect(result2.threads).toBe(2);
	});

	it('validates and completes partial config', () => {
		expect(() => validateAndCompleteConfig({ threads: 0 }, '/')).toThrow();
	});
}
