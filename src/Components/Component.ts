import { Schema, ComponentType, ComponentStore } from './types';

function Component(schema?: null | undefined): ComponentType<{}>;
function Component<T extends Schema>(schema: T): ComponentType<T>;
function Component(
	schema?: null | undefined | object,
): ComponentType<any, any> {
	if (!schema) {
		return TagComponent;
	}

	class ComponentClass {
		static schema = schema;
		$: ComponentStore;
		_: number;
		constructor(store: ComponentStore, eid: number) {
			this.$ = store;
			this._ = eid;
		}
	}

	// TODO: Fix this for sub-schemas.
	for (const stringKey in schema) {
		const key = Array.isArray(schema) ? Number(stringKey) : stringKey;
		Object.defineProperty(ComponentClass.prototype, key, {
			enumerable: true,
			get(this: ComponentClass) {
				//@ts-ignore
				return this.$[key][this._];
			},
			set(value: number) {
				this.$[key][this._] = value;
			},
		});
	}
	return ComponentClass as any;
}

export default Component;

class TagComponent {
	static schema = {};
}
