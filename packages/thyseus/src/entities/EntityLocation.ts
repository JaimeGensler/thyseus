import { u32 } from '../struct';
import { Store } from '../storage/Store';

export class EntityLocation {
	static size = 8;
	static alignment = 4;
	tableId: u32 = 0;
	row: u32 = 0;
	deserialize(store: Store): void {
		this.tableId = store.readU32();
		this.row = store.readU32();
	}
	serialize(store: Store): void {
		store.writeU32(this.tableId);
		store.writeU32(this.row);
	}

	set(tableId: u32, row: u32): this {
		this.tableId = tableId;
		this.row = row;
		return this;
	}
}
