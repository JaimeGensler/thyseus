export function assert(
	x: unknown,
	errorMessage: string,
	ErrorConstructor = Error,
): asserts x {
	if (!x) {
		throw new ErrorConstructor(errorMessage);
	}
}
