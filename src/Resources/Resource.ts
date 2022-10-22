import { Type } from '../Components';
import { getSize } from '../Components/getSize';
import { typeToBytes } from '../Components/Type';
import { Schema, SchemaInstance } from '../Components/types';
import { assert } from '../utils/assert';
import { createBuffer } from '../utils/createBuffer';
import {
	ThreadProtocol,
	type SendableClass,
	type SendableType,
} from '../utils/Threads';
import type { WorldConfig } from '../World/config';

export interface Class {
	new (...args: any[]): object;
}
export type ResourceType = SendableClass<SendableType> | Class;

export function Resource<T extends Schema>(
	schema: T,
): SendableClass<DataView> & { new (dataView: DataView): SchemaInstance<T> } {
	assert(
		Object.keys(schema).length !== 0,
		'Shareable Resources created with Resource() must pass a schema!',
	);

	class ResClass {
		static create(config: WorldConfig) {
			return new this(
				new DataView(createBuffer(config, getSize(schema))),
			);
		}

		__$$: DataView;
		constructor(data: DataView) {
			this.__$$ = data;
		}

		[ThreadProtocol.Send]() {
			return this.__$$;
		}
		static [ThreadProtocol.Receive](data: DataView) {
			return new this(data);
		}
	}

	//TODO: Make this work for sub-resources
	let offset = 0;
	for (const stringKey in schema) {
		const key = Array.isArray(schema) ? Number(stringKey) : stringKey;

		//@ts-ignore
		const [get, set]: ['getInt8', 'setInt8'] = typeToAccessors[schema[key]];
		Object.defineProperty(ResClass.prototype, key, {
			enumerable: true,
			get(this: ResClass) {
				return this.__$$[get](offset);
			},
			set(this: ResClass, value: number) {
				this.__$$[set](offset, value);
			},
		});
		//@ts-ignore
		offset += typeToBytes[schema[key]];
	}
	return ResClass as any;
}

const typeToAccessors = {
	[Type.u8]: ['getUint8', 'setUint8'],
	[Type.u16]: ['getUint16', 'setUint16'],
	[Type.u32]: ['getUint32', 'setUint32'],
	[Type.u64]: ['getBigUint64', 'setBigUint64'],

	[Type.i8]: ['getInt8', 'setInt8'],
	[Type.i16]: ['getInt16', 'setInt16'],
	[Type.i32]: ['getInt32', 'setInt32'],
	[Type.i64]: ['getBigInt64', 'setBigInt64'],

	[Type.f32]: ['getFloat32', 'setFloat32'],
	[Type.f64]: ['getFloat64', 'setFloat64'],
} as const;
