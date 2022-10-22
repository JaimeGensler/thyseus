import getSize from './getSize';
import { Schema, ComponentType, ComponentStore, SchemaInstance } from './types';

export default function Component(schema?: null | undefined): ComponentType<{}>;
export default function Component<T extends Schema>(
	schema: T,
): ComponentType<T> & { new (...args: any[]): SchemaInstance<T> };
export default function Component(
	schema?: null | undefined | Schema,
): ComponentType<any> {
	if (!schema) {
		return class ComponentClass {
			static schema = {};
			static size = 0;
		};
	}

	class ComponentClass {
		static schema = schema;
		static size = getSize(schema!);
		store: ComponentStore;
		index: number;
		constructor(store: ComponentStore, index: number) {
			this.store = store;
			this.index = index;
		}
	}

	for (const stringKey in schema) {
		const key = Array.isArray(schema) ? Number(stringKey) : stringKey;
		Object.defineProperty(ComponentClass.prototype, key, {
			enumerable: true,
			get(this: ComponentClass) {
				//@ts-ignore
				return this.store[key][this.index];
			},
			set(value: number) {
				this.store[key][this.index] = value;
			},
		});
	}
	return ComponentClass;
}
