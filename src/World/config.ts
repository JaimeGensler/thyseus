export interface WorldConfig {
	threads: number;
	maxEntities: number;
}
export interface SingleThreadedWorldConfig extends WorldConfig {
	threads: 1;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
	threads: 1,
	maxEntities: 2 ** 16, // 65_536
};

// TODO: Provide better info on how to resolve these errors.
export default function validateWorldConfig(
	{ threads, maxEntities }: WorldConfig,
	url: string | URL | undefined,
) {
	if (threads > 1) {
		if (!isSecureContext || typeof SharedArrayBuffer === 'undefined') {
			throw new Error(
				'Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer, which requires a secure context.',
			);
		}
		if (!url) {
			throw new Error(
				'Invalid config - Multithreading (threads > 1) requires a module URL parameter.',
			);
		}
	}
	// TODO: Lower max threads?
	if (threads < 1 || !Number.isSafeInteger(threads)) {
		throw new Error(
			"Invalid config - 'threads' must be a safe, positive integer (min 1).",
		);
	}
	if (maxEntities < 0 || !Number.isSafeInteger(maxEntities)) {
		throw new Error(
			"Invalid config - 'maxEntities' must be a safe, positive integer.",
		);
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, afterEach, vi } = import.meta.vitest;

	const validate =
		(config: Partial<WorldConfig>, url?: string | undefined) => () =>
			validateWorldConfig({ ...DEFAULT_WORLD_CONFIG, ...config }, url);

	describe('validateWorldConfig', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('when threads > 1', () => {
			it('throws if isSecureContext is false', () => {
				vi.stubGlobal('isSecureContext', false);
				expect(validate({ threads: 2 }, '/')).toThrow(
					/SharedArrayBuffer/,
				);
			});

			it('throws if a falsy module URL is provided', () => {
				vi.stubGlobal('isSecureContext', true);
				const expectedError = /module URL/;
				expect(validate({ threads: 2 }, '')).toThrow(expectedError);
				expect(validate({ threads: 2 }, undefined)).toThrow(
					expectedError,
				);
			});
		});

		it('throws if threads < 1, or not a safe, positive integer', () => {
			expect(validate({ threads: 0 }, '/')).toThrow(
				/'threads' must be a safe/,
			);
		});

		it('throws if maxEntities is not a safe, positive integer', () => {
			const expectedError = /'maxEntities' must be a safe/;
			expect(
				validate({ maxEntities: Number.MAX_SAFE_INTEGER + 1 }),
			).toThrow(expectedError);
			expect(validate({ maxEntities: Math.PI })).toThrow(expectedError);
			expect(validate({ maxEntities: -1 })).toThrow(expectedError);
		});
	});
}
