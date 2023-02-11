import { applyCommands } from '../systems';
import { Entity } from '../storage';
import { SEND_TABLE } from './channels';
import type { WorldBuilder } from './WorldBuilder';

export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystem(applyCommands.afterAll())
		.registerThreadChannel(SEND_TABLE);
}
