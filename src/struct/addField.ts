export const TYPE_TO_CONSTRUCTOR = {
	u8: Uint8Array,
	u16: Uint16Array,
	u32: Uint32Array,
	u64: BigUint64Array,
	i8: Int8Array,
	i16: Int16Array,
	i32: Int32Array,
	i64: BigInt64Array,
	f32: Float32Array,
	f64: Float64Array,
} as const;
export type PrimitiveName = keyof typeof TYPE_TO_CONSTRUCTOR;

let currentAlignment = 1;
let currentSize = 0;

const keys: (string | symbol)[] = [];
const alignments: number[] = [];
let currentOffset: Record<string | symbol, number> = {};
let currentPointers: Record<string | symbol, number[]> = {};

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
	pointers?: number[],
): Record<string | symbol, number> {
	currentAlignment = Math.max(currentAlignment, alignment);
	if (pointers) {
		currentPointers[fieldName] = pointers;
	}

	updateOffsets(fieldName, alignment, byteLength);
	currentSize += byteLength;

	return currentOffset;
}
export function resetFields() {
	const pointers: number[] = [];
	for (const key in currentPointers) {
		for (const pointer of currentPointers[key]) {
			pointers.push(pointer + currentOffset[key]);
		}
	}

	const result = {
		size: Math.ceil(currentSize / currentAlignment) * currentAlignment,
		alignment: currentAlignment,
		pointers,
	};
	currentSize = 0;
	currentAlignment = 1;

	currentOffset = {};
	currentPointers = {};
	keys.length = 0;
	alignments.length = 0;
	return result;
}
