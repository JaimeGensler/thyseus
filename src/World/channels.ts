import { Table } from '../storage';
import { Struct, StructStore } from '../struct';
import { bits } from '../utils/bits';
import { createMessageChannel } from '../utils/createMessageChannel';

export const GET_COMMAND_QUEUE = createMessageChannel(
	'thyseus::getCommandQueue',
	world => () => {
		const ret = new Map(world.commands.queue);
		world.commands.queue.clear();
		return ret;
	},
);
export const SEND_TABLE = createMessageChannel(
	'thyseus::sendTable',
	world =>
		(
			stores: StructStore[],
			capacity: number,
			id: number,
			bitfield: bigint,
		) => {
			const columns = [...bits(bitfield)].reduce((acc, cid, i) => {
				const component = world.components[cid];
				if (component.size! > 0) {
					acc.set(world.components[cid], stores[i]);
				}
				return acc;
			}, new Map<Struct, StructStore>());
			const table = new Table(columns, capacity, world.tableLengths, id);
			world.archetypes[id] = table;
			for (const query of world.queries) {
				query.testAdd(bitfield, table);
			}
		},
);
export const RESIZE_TABLE = createMessageChannel(
	'thyseus::resizeTable',
	world =>
		(tableId: number, newCapacity: number, newColumns: StructStore[]) => {
			const table = world.archetypes[tableId];
			table.capacity = newCapacity;
			let i = 0;
			for (const key of table.columns.keys()) {
				table.columns.set(key, newColumns[i++]);
			}
		},
);
export const RESIZE_TABLE_LENGTHS = createMessageChannel(
	'thyseus::resizeTableLengths',
	world => (lengths: Uint32Array) => {
		world.tableLengths = lengths;
	},
);
