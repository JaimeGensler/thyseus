export * from './Descriptors';
export { defineSystem, type SystemDefinition } from './defineSystem';
export { Mut } from './Mut';
export {
	getSystemDependencies,
	type Dependencies,
} from './getSystemDependencies';
export { getSystemIntersections } from './getSystemIntersections';
export { applyCommands } from './applyCommands';

export interface System {
	args: any[];
	execute(...args: any[]): void;
}
