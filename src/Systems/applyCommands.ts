import { P } from './Descriptors';
import defineSystem from './defineSystem';

export default defineSystem([P.World()], function applyCommands(world) {
	for (const eid of world.commands.modifiedEntities) {
		for (const query of world.queries.values()) {
			//@ts-ignore
			query.testAdd(eid, world.commands.entityData.get(eid));
		}
	}
	world.commands.modifiedEntities.clear();
});
