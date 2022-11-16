import { addField } from './addField';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
type DiscriminatedUnion<L, R> =
	| (L & { [Key in keyof R]?: never })
	| (R & { [Key in keyof L]?: never });
export function string({
	characterCount,
	byteLength,
}: DiscriminatedUnion<{ byteLength: number }, { characterCount: number }>) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		byteLength ??= characterCount! * 3;
		const offset = addField(
			propertyKey,
			Uint8Array.BYTES_PER_ELEMENT,
			byteLength,
		);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return decoder
					.decode(
						this.__$$s.u8.subarray(
							this.__$$b + offset[propertyKey],
							this.__$$b + offset[propertyKey] + byteLength!,
						),
					)
					.split('\u0000')[0];
			},
			set(value: string) {
				encoder.encodeInto(
					value,
					this.__$$s.u8
						.subarray(
							this.__$$b + offset[propertyKey],
							this.__$$b + offset[propertyKey] + byteLength!,
						)
						.fill(0),
				);
			},
		});
	};
}
