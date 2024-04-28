export type SystemParameterMap = Record<string, boolean>;

export const defaultSystemParameters: SystemParameterMap = {
	// Parameters
	World: true,
	Query: true,
	Res: true,
	SystemRes: true,
	EventReader: true,
	EventWriter: true,
	Thread: true,

	// Modifiers
	Readonly: false,
	With: true,
	Without: true,
	Or: true,
	And: true,
	Maybe: true,
};
