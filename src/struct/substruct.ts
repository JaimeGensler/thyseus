import { addField } from './addField';
import type { Struct } from './struct';

export function substruct(componentType: Struct) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const offset = addField(
			propertyKey,
			componentType.alignment!,
			componentType.size!,
			componentType.schema!,
		);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				const val: any = new componentType(this.__$$s, 0, {} as any);
				val.__$$b =
					this.__$$b + offset[propertyKey] * componentType.alignment!;
				return val;
			},
			set(value: any) {
				this.__$$s.u8.set(
					value.__$$s,
					this.__$$b + offset[propertyKey] * componentType.alignment!,
				);
			},
		});
	};
}
