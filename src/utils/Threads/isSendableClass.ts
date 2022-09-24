import ThreadProtocol, {
	type SendableClass,
	type SendableType,
} from './ThreadProtocol';

export default function isSendableClass<T extends SendableType = undefined>(
	x: unknown,
): x is SendableClass<T> {
	return (
		typeof x === 'function' &&
		ThreadProtocol.Receive in x &&
		ThreadProtocol.Send in x.prototype
	);
}
