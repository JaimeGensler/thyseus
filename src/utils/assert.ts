import { Class } from '../utilTypes';

export default function assert(
	x: unknown,
	errorMessage: string,
	errorConstructor: Class<Error, [string]> = Error,
): asserts x {
	if (!x) {
		throw new errorConstructor(errorMessage);
	}
}
