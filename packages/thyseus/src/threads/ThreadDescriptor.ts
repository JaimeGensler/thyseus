import type { SystemParameter } from '../systems';
import type { World } from '../world';

import { Threads } from './Threads';
import type { Thread } from './Thread';

export class ThreadDescriptor implements SystemParameter {
	#import: () => any;
	#path: string;
	constructor(x: [() => any, string]) {
		[this.#import, this.#path] = x;
	}

	async intoArgument(world: World): Promise<Thread<any>> {
		return (await world.getOrCreateResource(Threads)).getThread(this.#path);
	}
}
