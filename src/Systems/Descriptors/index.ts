import { CommandsDescriptor } from './CommandsDescriptor';
import { QueryDescriptor } from './QueryDescriptor';
import { ResourceDescriptor } from './ResourceDescriptor';
import { WorldDescriptor } from './WorldDescriptor';
import { Mut } from './Mut';
export type { Descriptor, DescriptorToArgument } from './Descriptor';

function wrap<P extends any[], I extends object>(Descriptor: {
	new (...args: P): I;
}) {
	return (...args: P) => new Descriptor(...args);
}

export { Mut };
export const descriptors = {
	Commands: wrap(CommandsDescriptor),
	Query: wrap(QueryDescriptor),
	Res: wrap(ResourceDescriptor),
	World: wrap(WorldDescriptor),
	Mut,
} as const;
export type Descriptors = typeof descriptors;
