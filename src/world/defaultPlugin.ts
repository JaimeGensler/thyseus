import { applyCommands } from '../commands';
import { CoreSchedule, run } from '../schedule';
import { Entity } from '../storage';
import { WorldDescriptor } from './WorldDescriptor';
import type { WorldBuilder } from './WorldBuilder';
import type { World } from './World';

export type Plugin = (worldBuilder: WorldBuilder) => void;

async function runInnerSchedules(world: World) {
	if (world.schedules[CoreSchedule.Outer].length > 1) {
		// Adding systems to outer schedules means the consumer has opted out of default outer scheduling
		return;
	}

	await world.runSchedule(CoreSchedule.Startup);
	let previousTime = 0;
	let delta = 0;

	async function loop(currentTime: number) {
		await world.runSchedule(CoreSchedule.Main);
		delta = currentTime - previousTime;
		for (let i = delta; i > 20; i -= 20) {
			// TODO: Test
			await world.runSchedule(CoreSchedule.FixedUpdate);
		}

		requestAnimationFrame(loop);
	}
	loop(0);
}
runInnerSchedules.parameters = [new WorldDescriptor()];

export function defaultPlugin(builder: WorldBuilder) {
	builder
		.registerComponent(Entity)
		.addSystemsToSchedule(CoreSchedule.Outer, runInnerSchedules)
		.addSystemsToSchedule(CoreSchedule.Main, run(applyCommands).last())
		.addSystemsToSchedule(CoreSchedule.Startup, run(applyCommands).last());
}
