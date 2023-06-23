import { Memory } from '../utils';

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
type Instance = { __$$b: number } & Record<string | symbol, any>;
export type Initialize = (instance: Instance) => void;
export type Copy = (from: number, to: number) => void;
export type Drop = (offset: number) => void;

let currentAlignment = 1;
let currentSize = 0;

const keys: (string | symbol)[] = [];
const alignments: number[] = [];
let currentOffset: Record<string | symbol, number> = {};
const currentInitializes: Initialize[] = [];
const currentCopies: Copy[] = [];
const currentDrops: Drop[] = [];

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
	initialize?: Initialize;
	copy?: Copy;
	drop?: Drop;
};
export function addField({
	name,
	size,
	alignment,
	initialize,
	copy,
	drop,
}: FieldProperties): Record<string | symbol, number> {
	if (initialize) {
		currentInitializes.push(initialize);
	}
	if (copy) {
		currentCopies.push(copy);
	}
	if (drop) {
		currentDrops.push(drop);
	}
	currentAlignment = Math.max(currentAlignment, alignment);

	updateOffsets(name, alignment, size);
	currentSize += size;

	return currentOffset;
}

export function resetFields() {
	const initializers = [...currentInitializes];
	const drops = [...currentDrops];
	const copies = [...currentCopies];
	const size = Math.ceil(currentSize / currentAlignment) * currentAlignment;
	const result = {
		size,
		alignment: currentAlignment,
		initialize(instance: Instance) {
			for (const initialize of initializers) {
				initialize(instance);
			}
		},
		drop(pointer: number) {
			for (const drop of drops) {
				drop(pointer);
			}
		},
		copy(from: number, to: number) {
			Memory.copy(from, size, to);
			for (const copy of copies) {
				copy(from, to);
			}
		},
	};
	currentSize = 0;
	currentAlignment = 1;

	currentOffset = {};
	keys.length = 0;
	alignments.length = 0;
	currentInitializes.length = 0;
	currentCopies.length = 0;
	currentDrops.length = 0;
	return result;
}
