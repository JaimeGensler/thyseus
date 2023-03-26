import { applyCommands } from '../commands';
import { CoreSchedule, runOuterSchedule } from '../schedule';
import { Entity } from '../storage';
import type { WorldBuilder } from './WorldBuilder';

export type Plugin = (worldBuilder: WorldBuilder) => void;
export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystemsToSchedule(CoreSchedule.Main, applyCommands)
		.addSystemsToSchedule(CoreSchedule.Startup, applyCommands)
		.addSystemsToSchedule(CoreSchedule.Outer, runOuterSchedule);
}
