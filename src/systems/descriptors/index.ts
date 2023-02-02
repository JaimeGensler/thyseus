import { CommandsDescriptor } from './CommandsDescriptor';
import { QueryDescriptor } from './QueryDescriptor';
import { ResourceDescriptor } from './ResourceDescriptor';
import { WorldDescriptor } from './WorldDescriptor';
import { Mut, Optional, With, Without, Or, OrContent } from '../../queries';
import { SystemResourceDescriptor } from './SystemResourceDescriptor';
export type { Descriptor } from './Descriptor';

function wrap<P extends any[], I extends object>(Descriptor: {
	new (...args: P): I;
}) {
	return (...args: P) => new Descriptor(...args);
}

export const descriptors = {
	Commands: wrap(CommandsDescriptor),
	Query: wrap(QueryDescriptor),
	Res: wrap(ResourceDescriptor),
	World: wrap(WorldDescriptor),
	SystemRes: wrap(SystemResourceDescriptor),

	Mut: wrap(Mut),
	Optional: wrap(Optional),
	With: wrap(With),
	Without: wrap(Without),
	Or<L extends OrContent, R extends OrContent>(
		l: OrContent,
		r: OrContent,
	): Or<L, R> {
		return new Or(l, r);
	},
} as const;
export type Descriptors = typeof descriptors;
