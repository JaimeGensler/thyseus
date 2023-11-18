export const indexTS = `
import { World, Schedule } from 'thyseus';

function start(world: World) {
	async function loop() {
		await world.runSchedule(Schedule);
		requestAnimationFrame(loop);
	}
	loop();
}
function helloWorld() {
	console.log('Hello, world!');
}

const world = await new World()
	.addEventListener('start', start)
	.addSystems(helloWorld, /* Your systems here! */)
	.prepare();

world.start();
`.trim();
