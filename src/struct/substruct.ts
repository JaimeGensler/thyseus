import { addField } from './addField';
import type { Struct } from './struct';

export function substruct(struct: Struct) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const offset = addField(
			propertyKey,
			struct.alignment!,
			struct.size!,
			struct.pointers,
		);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				const val: any = new struct();
				val.__$$s = this.__$$s;
				val.__$$b =
					this.__$$b + offset[propertyKey] * struct.alignment!;
				return val;
			},
			set(value: any) {
				this.__$$s.u8.set(
					value.__$$s,
					this.__$$b + offset[propertyKey] * struct.alignment!,
				);
			},
		});
	};
}
