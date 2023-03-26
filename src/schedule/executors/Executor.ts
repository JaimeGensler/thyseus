import type { World } from '../../world';
import type { SystemDefinition, SystemDependencies } from '../../systems';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systemDefinitions: SystemDefinition[],
		systemDependencies: SystemDependencies[],
	): ExecutorInstance;
};
