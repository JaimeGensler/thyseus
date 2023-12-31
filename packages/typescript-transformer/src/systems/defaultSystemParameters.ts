type SystemParameterDescriptor = { descriptorName: string; importPath: string };
export type SystemParameterMap = Record<
	string,
	SystemParameterDescriptor | null
>;

export const defaultSystemParameters: SystemParameterMap = {
	// Parameters
	World: {
		descriptorName: 'World',
		importPath: 'thyseus',
	},
	Commands: {
		descriptorName: 'Commands',
		importPath: 'thyseus',
	},
	Query: {
		descriptorName: 'Query',
		importPath: 'thyseus',
	},
	Res: {
		descriptorName: 'Res',
		importPath: 'thyseus',
	},
	SystemRes: {
		descriptorName: 'SystemRes',
		importPath: 'thyseus',
	},
	EventReader: {
		descriptorName: 'EventReader',
		importPath: 'thyseus',
	},
	EventWriter: {
		descriptorName: 'EventWriter',
		importPath: 'thyseus',
	},

	Thread: {
		descriptorName: 'Thread',
		importPath: 'thyseus',
	},

	// Modifiers
	Readonly: null,
	With: {
		descriptorName: 'With',
		importPath: 'thyseus',
	},
	Without: {
		descriptorName: 'Without',
		importPath: 'thyseus',
	},
	Or: {
		descriptorName: 'Or',
		importPath: 'thyseus',
	},
	And: {
		descriptorName: 'And',
		importPath: 'thyseus',
	},
};
