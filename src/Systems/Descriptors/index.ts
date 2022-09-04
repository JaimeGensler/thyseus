import CommandsDescriptor from './CommandsDescriptor';
import QueryDescriptor from './QueryDescriptor';
import ResDescriptor from './ResourceDescriptor';
import WorldDescriptor from './WorldDescriptor';
export type { default as Descriptor, DescriptorToArgument } from './Descriptor';

function wrap<P extends any[], I extends object>(Descriptor: {
	new (...args: P): I;
}) {
	return (...args: P) => new Descriptor(...args);
}
export const P = {
	Commands: wrap(CommandsDescriptor),
	Query: wrap(QueryDescriptor),
	Res: wrap(ResDescriptor),
	World: wrap(WorldDescriptor),
};
