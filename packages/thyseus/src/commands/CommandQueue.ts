import type { World } from '../world';

export type CommandQueue = { apply(world: World): void };
