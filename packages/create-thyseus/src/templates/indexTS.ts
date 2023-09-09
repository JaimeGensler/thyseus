export const indexTS = `
import { World, StartSchedule, DefaultSchedule } from 'thyseus';

function start(world: World) {
	async function loop() {
		await world.runSchedule(DefaultSchedule);
		requestAnimationFrame(loop);
	}
	loop();
}
function helloWorld() {
	console.log('Hello, world!');
}

const world = await World.new()
	.addSystemsToSchedule(StartSchedule, start)
	.addSystems(helloWorld, /* Your systems here! */)
	.build();

world.start();
`.trim();
