import type { World } from '../world';
import type { SystemDefinition } from '../systems';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systemDefinitions: SystemDefinition[],
	): ExecutorInstance;
};
