import type { SystemDefinition } from './defineSystem';

export * from './Descriptors';
export { defineSystem } from './defineSystem';
export { applyCommands } from './applyCommands';

export type { SystemDefinition };

export type Dependencies = {
	before?: SystemDefinition[];
	after?: SystemDefinition[];
	beforeAll?: boolean;
	afterAll?: boolean;
};
