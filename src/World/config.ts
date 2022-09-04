import assert from '../utils/assert';

export interface WorldConfig {
	threads: number;
	maxEntities: number;
}
export interface SingleThreadedWorldConfig extends WorldConfig {
	threads: 1;
}

function getCompleteConfig(config: Partial<WorldConfig> | undefined = {}) {
	return {
		threads: 1,
		maxEntities: 2 ** 16, // 65_536
		...config,
	};
}

// TODO: Provide better info on how to resolve these errors.
function validateConfig(config: WorldConfig, url: string | URL | undefined) {
	const { threads, maxEntities } = config;
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
		);
	}
	// TODO: Lower max threads?
	assert(
		threads > 0 && Number.isSafeInteger(threads),
		"Invalid config - 'threads' must be a safe, positive integer (min 1).",
	);
	assert(
		maxEntities > 0 && Number.isSafeInteger(maxEntities),
		"Invalid config - 'maxEntities' must be a safe, positive integer.",
	);
}
export default function validateAndCompleteConfig(
	inConfig: Partial<WorldConfig> | undefined,
	url: string | URL | undefined,
) {
	const completeConfig = getCompleteConfig(inConfig);
	validateConfig(completeConfig, url);
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

	it('throws if threads < 1, or not a safe, positive integer', () => {
		expect(validate({ threads: 0 }, '/')).toThrow(
			/'threads' must be a safe/,
		);
	});

	it('throws if maxEntities is not a safe, positive integer', () => {
		const expectedError = /'maxEntities' must be a safe/;
		expect(validate({ maxEntities: Number.MAX_SAFE_INTEGER + 1 })).toThrow(
			expectedError,
		);
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
