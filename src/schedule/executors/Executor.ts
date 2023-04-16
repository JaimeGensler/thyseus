import type { SystemConfig } from '../run';
import type { World } from '../../world';
import type { System } from '../../systems';

export type ExecutorInstance = {
	start(): Promise<void>;
	get length(): number;
};
export type ExecutorType = {
	fromWorld(
		world: World,
		systems: (System | SystemConfig)[],
		systemArguments: any[][],
	): ExecutorInstance;
};
