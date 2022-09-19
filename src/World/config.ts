import assert from '../utils/assert';

export interface WorldConfig {
	threads: number;
	maxEntities: number;
	tableSizes: number[];
}
export interface SingleThreadedWorldConfig extends WorldConfig {
	threads: 1;
}

const DEFAULT_TABLE_SIZES = [
	8, 16, 32, 64, 128, 256, 512, 1_024, 2_048, 4_096, 8_192, 16_384, 32_768,
	65_536, 131_072, 262_144, 524_288, 1_048_576, 2_097_152, 4_194_304,
	8_388_608, 16_777_216, 33_554_432, 67_108_864, 134_217_728, 268_435_456,
	536_870_912, 1_073_741_824,
];
function getCompleteConfig(config: Partial<WorldConfig> | undefined = {}) {
	return {
		threads: 1,
		maxEntities: 2 ** 16, // 65_536
		tableSizes: DEFAULT_TABLE_SIZES,
		...config,
	};
}

// TODO: Provide better info on how to resolve these errors.
function validateConfig(
	{ threads, maxEntities, tableSizes }: WorldConfig,
	url: string | URL | undefined,
) {
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
	assert(
		tableSizes.every(
			(_, i) =>
				i === tableSizes.length - 1 ||
				tableSizes[i] < tableSizes[i + 1],
		),
		'Invalid config - `tableSizes` must be sorted ascending.',
	);
	assert(
		tableSizes.every(x => x % 8 === 0),
		'Invalid config - every values of `tableSizes` must be a multiple of 8.',
	);
	assert(
		tableSizes[tableSizes.length - 1] >= maxEntities,
		'Invalid config - the last value of `tableSizes` must be greater than or equal to `maxEntities`.',
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

	it('throws if tableSizes is not sorted', () => {
		expect(validate({ tableSizes: [16, 8] })).toThrow(/sorted ascending/);
		expect(validate({ tableSizes: [8, 16, 32, 64, 256, 128] })).toThrow(
			/sorted ascending/,
		);
	});
	it('throws if any tableSize is not a multiple of 8', () => {
		expect(validate({ tableSizes: [3] })).toThrow(/multiple of 8/);
		expect(validate({ tableSizes: [8, 16, 33] })).toThrow(/multiple of 8/);
	});
	it('throws if the last value of tableSizes is less than maxEntities', () => {
		expect(validate({ tableSizes: [8], maxEntities: 9 })).toThrow(
			/greater than or equal to/,
		);
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
