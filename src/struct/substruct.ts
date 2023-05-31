import { addField } from './addField';
import { Memory } from '../utils';
import { dropStruct } from '../storage';
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
				// TODO: Rework this - we don't want to allocate every access
				const instance = new struct();
				dropStruct(instance);
				(instance as any).__$$b = this.__$$b + offset[propertyKey];
				return instance;
			},
			set(value: any) {
				Memory.copy(value.__$$b, struct.size!, this.__$$b);
			},
		});
	};
}
