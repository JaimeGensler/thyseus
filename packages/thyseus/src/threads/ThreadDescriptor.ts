import { SystemParameter } from '../systems';
import { World, WorldBuilder } from '../world';
import { Thread } from './Thread';

export class ThreadDescriptor implements SystemParameter {
	#import: () => any;
	#path: string;
	constructor(x: [() => any, string]) {
		[this.#import, this.#path] = x;
	}

	isLocalToThread(): boolean {
		return true;
	}
	intersectsWith(other: unknown): boolean {
		return true;
	}
	onAddSystem(builder: WorldBuilder) {}
	intoArgument(world: World): Thread<any> {
		let thread = world.threads.find(thread => thread.module === this.#path);
		if (thread) {
			return thread;
		}
		thread = new Thread(world.config.createWorker(this.#path), this.#path);
		world.threads.push(thread);
		return thread;
	}
}
