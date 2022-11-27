import { applyCommands } from '../Systems';
import { bits } from '../utils/bits';
import { Entity, Table } from '../storage';
import type { Struct, StructStore } from '../struct';
import type { WorldBuilder } from './WorldBuilder';

export function defaultPlugin(builder: WorldBuilder) {
	builder.addSystem(applyCommands, { afterAll: true });
	builder.registerComponent(Entity);

	builder.registerThreadChannel('thyseus::getCommandQueue', world => () => {
		const ret = new Map(world.commands.queue);
		world.commands.queue.clear();
		return ret;
	});
	builder.registerThreadChannel<[bigint, StructStore[], Uint32Array]>(
		'thyseus::newTable',
		world =>
			([tableId, stores, meta]) => {
				const columns = [...bits(tableId)].reduce(
					(acc, cid, i) => acc.set(world.components[cid], stores[i]),
					new Map<Struct, StructStore>(),
				);
				const table = new Table(columns, meta);
				world.archetypes.set(tableId, table);
				for (const query of world.queries) {
					query.testAdd(tableId, table);
				}
			},
	);
	builder.registerThreadChannel<[bigint, StructStore[]]>(
		'thyseus::growTable',
		world =>
			([tableId, stores]) => {
				const table = world.archetypes.get(tableId)!;
				let i = 0;
				for (const key of table.columns.keys()) {
					table.columns.set(key, stores[i++]);
				}
			},
	);
}
