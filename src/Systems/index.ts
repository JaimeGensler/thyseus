export * from './Descriptors';
export { defineSystem, type SystemDefinition } from './defineSystem';
export {
	getSystemDependencies,
	type Dependencies,
} from './getSystemDependencies';
export { getSystemIntersections } from './getSystemIntersections';
export { applyCommands } from './applyCommands';

export type System = {
	args: any[];
	execute(...args: any[]): void | Promise<void>;
};
