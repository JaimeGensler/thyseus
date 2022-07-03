import { Schema, SchemaClass, SchemaData } from './types';

export default function Component(schema?: null | undefined): SchemaClass<{}>;
export default function Component<T extends Schema>(schema: T): SchemaClass<T>;
export default function Component(
	schema?: null | undefined | object,
): SchemaClass<any> {
	if (!schema) {
		//@ts-ignore
		return TagComponent;
	}

	class ComponentClass {
		static schema = schema;
		$: SchemaData;
		_: number;
		constructor(store: SchemaData, eid: number) {
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

class TagComponent {
	static schema = {};
	constructor(store: null, eid: number) {
		throw new Error('Tried to construct a Tag Component!');
	}
}
