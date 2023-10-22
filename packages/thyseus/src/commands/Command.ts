import type { Class } from '../components';
import type { World } from '../world';
import type { Commands } from './Commands';

export type Command = Class & {
	iterate(commands: Commands, world: World): any;
};
