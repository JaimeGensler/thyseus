import { CoreSchedule } from './CoreSchedule';
import { WorldDescriptor } from '../descriptors';
import type { World } from '../world';

//@thyseus-ignore
export async function runOuterSchedule(world: World) {
	await world.runSchedule(CoreSchedule.Startup);

	async function loop(timestep: number) {
		await world.runSchedule(CoreSchedule.Main);
		requestAnimationFrame(loop);
	}
	loop(0);
}
runOuterSchedule.parameters = [WorldDescriptor()];
