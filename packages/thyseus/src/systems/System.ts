import type { World } from '../world';

export type SystemParameter = {
	intoArgument(world: World): any;
};

export type System = ((...args: any[]) => void | Promise<void>) & {
	parameters?: SystemParameter[];
};
