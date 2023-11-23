import { DEV } from 'esm-env';

/**
 * Assert the provided condition in development builds only.
 * @param condition The condition to assert.
 * @param errorMessage The error message if the assertion fails.
 * @param ErrorConstruction The type of the error to throw.
 */
export function DEV_ASSERT(
	condition: unknown,
	errorMessage: string,
	ErrorConstruction = Error,
): asserts condition {
	if (DEV) {
		if (!condition) {
			throw new ErrorConstruction(errorMessage);
		}
	}
}
