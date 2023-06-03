import { addField } from './addField';
import { Memory } from '../utils';
import { dropStruct } from '../storage';
import type { Struct } from './struct';

export function substruct(struct: Struct) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const hiddenKey = Symbol();
		const offset = addField({
			name: propertyKey,
			size: struct.size!,
			alignment: struct.alignment!,
			pointers: struct.pointers,
			initializer(val) {
				val[hiddenKey] = new struct();
				dropStruct(val[hiddenKey]);
			},
		});

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				this[hiddenKey].__$$b = this.__$$b + offset[propertyKey];
				return this[hiddenKey];
			},
			set(value: any) {
				Memory.copy(value.__$$b, struct.size!, this.__$$b);
			},
		});
	};
}
