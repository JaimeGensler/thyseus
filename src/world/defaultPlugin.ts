import { applyCommands } from '../commands';
import { CoreSchedule, run } from '../schedule';
import { Entity } from '../storage';
import { WorldDescriptor } from './WorldDescriptor';
import type { WorldBuilder } from './WorldBuilder';
import type { World } from './World';

export type Plugin = (worldBuilder: WorldBuilder) => void;

// thyseus-ignore
async function runOuterSchedule(world: World) {
	if (world.schedules[CoreSchedule.Outer].length > 1) {
		// Adding systems to outer schedules means the consumer has opted out of scheduling!
		return;
	}

	await world.runSchedule(CoreSchedule.Startup);
	async function loop(timestep: number) {
		await world.runSchedule(CoreSchedule.Main);
		requestAnimationFrame(loop);
	}
	loop(0);
}
runOuterSchedule.parameters = [new WorldDescriptor()];

export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystemsToSchedule(CoreSchedule.Main, run(applyCommands).last())
		.addSystemsToSchedule(CoreSchedule.Startup, run(applyCommands).last())
		.addSystemsToSchedule(CoreSchedule.Outer, runOuterSchedule);
}
