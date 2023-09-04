export const indexTS = `
import { World } from 'thyseus';

const world = await World.new().build();

world.start();
`.trim();
