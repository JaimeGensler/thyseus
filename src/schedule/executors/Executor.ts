import type { SystemOrder } from '../order';
import type { World } from '../../world';
import type { System } from '../../systems';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systems: (System | SystemOrder)[],
		systemArguments: any[][],
	): ExecutorInstance;
};
