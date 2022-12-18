import { DEV } from 'esm-env';
import { assert } from '../utils/assert';

export interface WorldConfig {
	threads: number;
	maxEntities: number;
	getNewTableSize(prev: number): number;
}
export interface SingleThreadedWorldConfig extends WorldConfig {
	threads: 1;
}

const getCompleteConfig = (config: Partial<WorldConfig> | undefined = {}) => ({
	threads: 1,
	maxEntities: 2 ** 16, // 65_536
	getNewTableSize: (prev: number) => (prev === 0 ? 8 : prev * 2),
	...config,
});

// TODO: Provide better info on how to resolve these errors.
const validateConfig = (
	{ threads, maxEntities }: WorldConfig,
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
	// TODO: Lower max threads further? The "correct" max is navigator.hardwareConcurrency
	assert(
		Number.isInteger(threads) && 0 < threads && threads < 64,
		"Invalid config - 'threads' must be an integer such that 0 < threads < 64",
		RangeError,
	);
	assert(
		Number.isInteger(maxEntities) &&
			0 < maxEntities &&
			maxEntities < 2 ** 32,
		"Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
		RangeError,
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

	it('throws if maxEntities is not a positive integer < 2**32', () => {
		const expectedError = /'maxEntities' must be an integer/;
		expect(validate({ maxEntities: 2 ** 32 })).toThrow(expectedError);
		expect(validate({ maxEntities: Math.PI })).toThrow(expectedError);
		expect(validate({ maxEntities: -1 })).toThrow(expectedError);
	});

	it('completes partial config', () => {
		const result = getCompleteConfig();
		expect(result).toHaveProperty('threads');
		expect(result.threads).toBe(1);
		expect(result).toHaveProperty('maxEntities');

		const result2 = getCompleteConfig({ threads: 2 });
		expect(result2.threads).toBe(2);
		expect(result2).toHaveProperty('maxEntities');
	});

	it('validates and completes partial config', () => {
		expect(() => validateAndCompleteConfig({ threads: 0 }, '/')).toThrow();

		expect(validateAndCompleteConfig({ threads: 2 }, '/')).toHaveProperty(
			'maxEntities',
		);
	});
}
