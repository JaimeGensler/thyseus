import { applyCommands } from '../systems';
import { Entity } from '../storage';
import {
	GET_COMMAND_QUEUE,
	RESIZE_TABLE,
	RESIZE_TABLE_LENGTHS,
	SEND_TABLE,
} from './channels';
import type { WorldBuilder } from './WorldBuilder';

export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystem(applyCommands.afterAll())
		.registerThreadChannel(GET_COMMAND_QUEUE)
		.registerThreadChannel(SEND_TABLE)
		.registerThreadChannel(RESIZE_TABLE)
		.registerThreadChannel(RESIZE_TABLE_LENGTHS);
}
