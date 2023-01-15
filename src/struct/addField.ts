let currentSchema: number = 0;
let currentAlignment = 1;
let currentSize = 0;

let keys: (string | symbol)[] = [];
let alignments: number[] = [];
let currentOffset: Record<string | symbol, number> = {};

const updateOffsets = (
	newKey: string | symbol,
	alignment: number,
	byteLength: number,
) => {
	const position = alignments.reduce(
		(acc, value, i) => (value < alignment && i < acc ? i : acc),
		alignments.length,
	);
	if (position === alignments.length) {
		keys.push(newKey);
		alignments.push(alignment);
		currentOffset[newKey] = keys.length === 0 ? 0 : currentSize;
		return;
	}

	const occupyKey = keys[position];
	keys.splice(position, 0, newKey);
	alignments.splice(position, 0, alignment);

	currentOffset[newKey] = currentOffset[occupyKey];
	for (let i = position + 1; i < keys.length; i++) {
		currentOffset[keys[i]] += byteLength;
	}

	return;
};

export function addField(
	fieldName: string | symbol,
	alignment: number,
	byteLength: number,
	schemaFields: number = 0,
): Record<string | symbol, number> {
	currentAlignment = Math.max(currentAlignment, alignment);
	currentSchema |= schemaFields;

	updateOffsets(fieldName, alignment, byteLength);
	currentSize += byteLength;

	return currentOffset;
}
export function resetFields() {
	const result = {
		schema: currentSchema,
		size: Math.ceil(currentSize / currentAlignment) * currentAlignment,
		alignment: currentAlignment,
	};
	currentSchema = 0;
	currentSize = 0;
	currentAlignment = 1;

	for (let i = 0; i < keys.length; i++) {
		currentOffset[keys[i]] /= alignments[i];
	}

	currentOffset = {};
	keys.length = 0;
	alignments.length = 0;
	return result;
}
