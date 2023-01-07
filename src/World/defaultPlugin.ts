import { applyCommands } from '../Systems';
import { Entity } from '../storage';
import {
	GET_COMMAND_QUEUE,
	RESIZE_TABLE,
	RESIZE_TABLE_LENGTHS,
	SEND_TABLE,
} from './channels';
import type { WorldBuilder } from './WorldBuilder';

export function defaultPlugin(builder: WorldBuilder) {
	builder.registerComponent(Entity);
	builder.addSystem(applyCommands.afterAll());
	builder.registerThreadChannel(GET_COMMAND_QUEUE);
	builder.registerThreadChannel(SEND_TABLE);
	builder.registerThreadChannel(RESIZE_TABLE);
	builder.registerThreadChannel(RESIZE_TABLE_LENGTHS);
}
