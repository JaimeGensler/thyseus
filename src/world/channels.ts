import { Table } from '../storage';
import { bits } from '../utils/bits';
import { createThreadChannel } from '../threads';
import type { Struct } from '../struct';

export const SEND_TABLE = createThreadChannel(
	'thyseus::sendTable',
	world => (pointer: number, id: number, bitfield: bigint) => {
		const columns = [...bits(bitfield)].reduce((acc, cid) => {
			const component = world.components[cid];
			if (component.size! > 0) {
				acc.push(component);
			}
			return acc;
		}, [] as Struct[]);
		const table = new Table(world, columns, pointer, bitfield, id);
		world.archetypes[id] = table;
		for (const query of world.queries) {
			query.testAdd(bitfield, table);
		}
	},
);
