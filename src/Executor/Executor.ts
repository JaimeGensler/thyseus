import { Dependencies, SystemDefinition } from '../Systems';
import { World } from '../World';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
	): ExecutorInstance;
};
