import type { Struct } from '../components';
import type { World } from '../world';
import type { Commands } from './Commands';

export type Command = Struct & {
	iterate(commands: Commands, world: World): any;
};
