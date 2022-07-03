import { Schema, SchemaClass, SchemaData } from './types';
import { typeToBytes, typeToConstructor } from './Type';

interface CreateStoreOptions {
	maxCount: number;
	isShared: boolean;
}
export default function createStore<T extends Schema>(
	schemaClass: SchemaClass<T>,
	{ maxCount, isShared }: CreateStoreOptions,
): SchemaData<T> {
	const bytesPerElement = getBytesPerElement(schemaClass.schema);
	const buffer: ArrayBufferLike = new (
		isShared ? SharedArrayBuffer : ArrayBuffer
	)(bytesPerElement * maxCount);

	return getSchemaStore(schemaClass.schema, buffer, [0], maxCount);
}

const getBytesPerElement = (schema: Schema): number =>
	(Array.isArray(schema) ? schema : Object.values(schema)).reduce(
		(acc, field) =>
			acc +
			(typeof field === 'number'
				? typeToBytes[field]
				: getBytesPerElement(field.schema)),
		0,
	);

const getSchemaStore = (
	schema: Schema,
	buffer: ArrayBufferLike,
	offset: [number],
	length: number,
): SchemaData<any> => {
	const isArray = Array.isArray(schema);

	return Object.entries(schema).reduce((acc, [stringKey, field], index) => {
		const key = isArray ? index : stringKey;
		if (typeof field === 'number') {
			acc[key] = new typeToConstructor[field](buffer, offset[0], length);
			offset[0] += length * typeToBytes[field];
		} else {
			acc[key] = getSchemaStore(field.schema, buffer, offset, length);
		}
		return acc;
	}, (isArray ? [] : {}) as SchemaData<any>);
};
