import type { Struct, StructStore } from '../struct';
import type { WorldCommands } from '../World/WorldCommands';

interface StructInstance {
	__$$s: StructStore;
	__$$b: number;
	__$$c: WorldCommands;
}
const cache = new Map<Struct, StructInstance[]>();
export const pool = {
	get(
		struct: Struct,
		store: StructStore,
		byteOffset: number,
		commands: WorldCommands,
	) {
		if (!cache.has(struct)) {
			cache.set(struct, []);
		}
		const items = cache.get(struct)!;
		if (items.length === 0) {
			// TODO: structs use index for second arg, move to byteOffset
			return new struct(store, byteOffset, commands);
		}
		const item: any = items.pop();
		item.__$$s = store;
		item.__$$b = byteOffset;
		item.__$$c = commands;
		return item;
	},
	return(struct: Struct, item: object) {
		cache.get(struct)!.push(item as StructInstance);
	},
};

// TODO: Tests
