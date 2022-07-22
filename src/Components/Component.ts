import { Schema, SchemaClass, SchemaData } from './types';

function Component(schema?: null | undefined): SchemaClass<{}>;
function Component<T extends Schema>(schema: T): SchemaClass<T>;
function Component(schema?: null | undefined | object): SchemaClass<any> {
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
function isSchemaClass(val: unknown): val is SchemaClass {
	return typeof val === 'function' && 'schema' in val;
}
Component.is = isSchemaClass;
export default Component;

class TagComponent {
	static schema = {};
	constructor(store: {}, eid: number) {
		throw new Error('Tried to construct a Tag Component!');
	}
}
