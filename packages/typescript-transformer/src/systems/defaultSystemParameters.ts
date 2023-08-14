type SystemParameterDescriptor = { descriptorName: string; importPath: string };
export type SystemParameterMap = Record<string, SystemParameterDescriptor>;

export const defaultSystemParameters: SystemParameterMap = {
	// Parameters
	Query: {
		descriptorName: 'QueryDescriptor',
		importPath: 'thyseus',
	},
	Res: {
		descriptorName: 'ResourceDescriptor',
		importPath: 'thyseus',
	},
	Commands: {
		descriptorName: 'CommandsDescriptor',
		importPath: 'thyseus',
	},
	World: {
		descriptorName: 'WorldDescriptor',
		importPath: 'thyseus',
	},
	SystemRes: {
		descriptorName: 'SystemResourceDescriptor',
		importPath: 'thyseus',
	},
	EventReader: {
		descriptorName: 'EventReaderDescriptor',
		importPath: 'thyseus',
	},
	EventWriter: {
		descriptorName: 'EventWriterDescriptor',
		importPath: 'thyseus',
	},

	// Modifiers
	Mut: {
		descriptorName: 'Mut',
		importPath: 'thyseus',
	},
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
	// Optional: {
	// 	descriptorName: 'Optional',
	// 	importPath: 'thyseus',
	// },
};
