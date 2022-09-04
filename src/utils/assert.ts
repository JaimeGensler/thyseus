import { Class } from '../utilTypes';

export default function assert(
	x: unknown,
	errorMessage: string,
	ErrorConstructor: Class = Error,
): asserts x {
	if (!x) {
		throw new ErrorConstructor(errorMessage);
	}
}
