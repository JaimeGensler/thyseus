import { defineSystem } from '../systems';
import { CoreSchedule } from './CoreSchedule';

export const runOuterSchedule = defineSystem(
	({ World }) => [World()],
	async function runOuterSchedule(world) {
		await world.runSchedule(CoreSchedule.Startup);

		async function loop(timestep: number) {
			await world.runSchedule(CoreSchedule.Main);
			requestAnimationFrame(loop);
		}
		loop(0);
	},
);
