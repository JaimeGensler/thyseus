import { DEV } from 'esm-env';

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
