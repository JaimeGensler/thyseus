import { CommandsDescriptor as CommandsDescriptorClass } from './commands';
import { QueryDescriptor as QueryDescriptorClass } from './queries';
import { ResourceDescriptor as ResourceDescriptorClass } from './resources';
import { WorldDescriptor as WorldDescriptorClass } from './world';
import { SystemResourceDescriptor as SystemResourceDescriptorClass } from './resources';
import {
	EventReaderDescriptor as EventReaderDescriptorClass,
	EventWriterDescriptor as EventWriterDescriptorClass,
} from './events';
import {
	Mut as MutModifier,
	Optional as OptionalModifier,
	With as WithModifier,
	Without as WithoutModifier,
	Or as OrModifier,
} from './queries';

function wrap<P extends any[], I extends object>(Descriptor: {
	new (...args: P): I;
}) {
	return (...args: P) => new Descriptor(...args);
}

export const CommandsDescriptor = wrap(CommandsDescriptorClass);
export const QueryDescriptor = wrap(QueryDescriptorClass);
export const ResourceDescriptor = wrap(ResourceDescriptorClass);
export const SystemResourceDescriptor = wrap(SystemResourceDescriptorClass);
export const WorldDescriptor = wrap(WorldDescriptorClass);
export const EventReaderDescriptor = wrap(EventReaderDescriptorClass);
export const EventWriterDescriptor = wrap(EventWriterDescriptorClass);

export const Mut = wrap(MutModifier);
export const With = wrap(WithModifier);
export const Without = wrap(WithoutModifier);
export const Optional = wrap(OptionalModifier);
export const Or = wrap(OrModifier);
