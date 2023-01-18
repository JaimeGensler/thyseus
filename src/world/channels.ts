import { Table } from '../storage';
import { bits } from '../utils/bits';
import { createThreadChannel } from '../threads';
import type { Struct, StructStore } from '../struct';

export const GET_COMMAND_QUEUE = createThreadChannel(
	'thyseus::getCommandQueue',
	world => () => world.commands.getData(),
);
export const CLEAR_COMMAND_QUEUE = createThreadChannel(
	'thyseus::clearCommandQueue',
	world => () => {
		world.commands.reset();
	},
);
export const SEND_TABLE = createThreadChannel(
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
					acc.set(world.components[cid], stores.shift()!);
				}
				return acc;
			}, new Map<Struct, StructStore>());
			const table = new Table(world, columns, capacity, bitfield, id);
			world.archetypes[id] = table;
			for (const query of world.queries) {
				query.testAdd(bitfield, table);
			}
		},
);
export const RESIZE_TABLE = createThreadChannel(
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
export const RESIZE_TABLE_LENGTHS = createThreadChannel(
	'thyseus::resizeTableLengths',
	world => (lengths: Uint32Array) => {
		world.tableLengths = lengths;
	},
);
export const RESIZE_ENTITY_LOCATIONS = createThreadChannel(
	'thyseus::resizeEntityLocations',
	world => (locs: Uint32Array) => {
		world.entities.setLocations(locs);
	},
);
