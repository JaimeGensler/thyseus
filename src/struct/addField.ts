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
type Initializer = (value: Record<string | symbol, any>) => void;

let currentAlignment = 1;
let currentSize = 0;

const keys: (string | symbol)[] = [];
const alignments: number[] = [];
let currentOffset: Record<string | symbol, number> = {};
let currentPointers: Record<string | symbol, number[]> = {};
const currentInitializers: Initializer[] = [];

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

type FieldProperties = {
	name: string | symbol;
	size: number;
	alignment: number;
	pointers?: number[];
	initializer?(instance: Record<string | symbol, any>): void;
};
export function addField({
	name,
	size,
	alignment,
	pointers,
	initializer,
}: FieldProperties): Record<string | symbol, number> {
	if (initializer) {
		currentInitializers.push(initializer);
	}
	currentAlignment = Math.max(currentAlignment, alignment);
	if (pointers) {
		currentPointers[name] = pointers;
	}

	updateOffsets(name, alignment, size);
	currentSize += size;

	return currentOffset;
}

export function resetFields() {
	const pointers: number[] = [];
	for (const key in currentPointers) {
		for (const pointer of currentPointers[key]) {
			pointers.push(pointer + currentOffset[key]);
		}
	}

	const initializers = [...currentInitializers];
	const result = {
		size: Math.ceil(currentSize / currentAlignment) * currentAlignment,
		alignment: currentAlignment,
		pointers,
		init(value: Record<string | symbol, any>) {
			for (const initializer of [...initializers]) {
				initializer(value);
			}
		},
	};
	currentSize = 0;
	currentAlignment = 1;

	currentOffset = {};
	currentPointers = {};
	keys.length = 0;
	alignments.length = 0;
	currentInitializers.length = 0;
	return result;
}
