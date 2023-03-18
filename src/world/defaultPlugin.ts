import { applyCommands } from '../commands';
import { Entity } from '../storage';
import type { WorldBuilder } from './WorldBuilder';

export type Plugin = (worldBuilder: WorldBuilder) => void;
export function defaultPlugin(builder: WorldBuilder) {
	builder.registerComponent(Entity).addSystem(applyCommands.afterAll());
}
