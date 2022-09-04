import { Schema, ComponentType, ComponentStore } from './types';
import { typeToBytes, typeToConstructor } from './Type';
import type { WorldConfig } from '../World/config';

export default function createStore<T extends Schema>(
	ComponentType: ComponentType<T>,
	{ maxEntities, threads }: WorldConfig,
): ComponentStore<T> {
	const isShared = threads > 1;
	const bytesPerElement = getBytesPerElement(ComponentType.schema);
	const buffer: ArrayBufferLike = new (
		isShared ? SharedArrayBuffer : ArrayBuffer
	)(bytesPerElement * maxEntities);

	return getSchemaStore(ComponentType.schema, buffer, [0], maxEntities);
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
): ComponentStore<any> => {
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
	}, (isArray ? [] : {}) as ComponentStore<any>);
};
