import type { World } from '../world';

import { Thread } from './Thread';

export class Threads {
	static fromWorld(world: World) {
		return new this(world);
	}

	#threads: Thread<any>[];
	#createWorker: (scriptURL: string) => Worker;
	constructor(world: World) {
		this.#threads = [];
		this.#createWorker = world.config.createWorker;
		world.addEventListener('stop', () => {
			for (const thread of this.#threads) {
				thread.terminate();
			}
		});
	}

	getThread<T extends object = any>(module: string): Thread<T> {
		let thread = this.#threads.find(thread => thread.module === module);
		if (!thread) {
			thread = new Thread(this.#createWorker(module), module);
			this.#threads.push(thread);
		}
		return thread;
	}
}
