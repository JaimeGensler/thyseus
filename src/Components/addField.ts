import type { TypedArrayConstructor } from './types';

let currentSchema: Record<string | symbol, TypedArrayConstructor> = {};
let currentFieldSizes: Record<string | symbol, number> = {};
let currentAlignment = 1;
let currentSize = 0;

export function addField(
	fieldName: string | symbol,
	type: TypedArrayConstructor,
	bytes: number = type.BYTES_PER_ELEMENT,
) {
	currentSchema[fieldName] = type;
	if (bytes !== type.BYTES_PER_ELEMENT) {
		currentFieldSizes[fieldName] = bytes;
	}
	currentSize += bytes;
	currentAlignment = Math.max(currentAlignment, type.BYTES_PER_ELEMENT);
}
export function resetFields() {
	const result = {
		schema: currentSchema,
		fieldSizes: currentFieldSizes,
		size: currentSize,
		alignment: currentAlignment,
	};
	currentSchema = {};
	currentFieldSizes = {};
	currentSize = 0;
	currentAlignment = 1;
	return result;
}
