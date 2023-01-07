import type { World } from '../World';
import type { SystemDefinition } from '../Systems';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systemDefinitions: SystemDefinition[],
	): ExecutorInstance;
};
