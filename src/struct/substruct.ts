import { addField } from './addField';
import { memory } from '../utils/memory';
import type { Struct } from './struct';
import { createManagedStruct } from '../storage/initStruct';

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
				return createManagedStruct(
					struct,
					this.__$$b + offset[propertyKey],
				);
			},
			set(value: any) {
				memory.copy(value.__$$b, struct.size!, this.__$$b);
			},
		});
	};
}
