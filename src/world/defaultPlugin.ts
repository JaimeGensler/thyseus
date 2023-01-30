import { applyCommands } from '../systems';
import { Entity } from '../storage';
import { CLEAR_COMMAND_QUEUE, GET_COMMAND_QUEUE, SEND_TABLE } from './channels';
import type { WorldBuilder } from './WorldBuilder';

export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystem(applyCommands.afterAll())
		.registerThreadChannel(SEND_TABLE)
		.registerThreadChannel(GET_COMMAND_QUEUE)
		.registerThreadChannel(CLEAR_COMMAND_QUEUE);
}
