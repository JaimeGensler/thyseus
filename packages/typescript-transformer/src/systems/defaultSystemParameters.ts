type SystemParameterDescriptor = { descriptorName: string; importPath: string };
export type SystemParameterMap = Record<string, SystemParameterDescriptor>;

export const defaultSystemParameters: SystemParameterMap = {
	// Parameters
	World: {
		descriptorName: 'WorldDescriptor',
		importPath: 'thyseus',
	},
	Commands: {
		descriptorName: 'CommandsDescriptor',
		importPath: 'thyseus',
	},
	Query: {
		descriptorName: 'QueryDescriptor',
		importPath: 'thyseus',
	},
	Res: {
		descriptorName: 'ResourceDescriptor',
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

	Thread: {
		descriptorName: 'ThreadDescriptor',
		importPath: 'thyseus',
	},

	// Modifiers
	Read: {
		descriptorName: 'ReadModifier',
		importPath: 'thyseus',
	},
	Readonly: {
		descriptorName: 'ReadModifier',
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
	And: {
		descriptorName: 'And',
		importPath: 'thyseus',
	},
};
