class ThyseusCompilerError extends Error {}

export function assert(
	condition: unknown,
	errorMessage: string,
	errorType = ThyseusCompilerError,
): asserts condition {
	if (!condition) {
		throw new errorType(errorMessage);
	}
}
