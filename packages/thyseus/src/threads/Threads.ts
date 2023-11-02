import type { World, WorldConfig } from '../world';

import { Thread } from './Thread';

export class Threads {
	static fromWorld(world: World) {
		return new this(world.config.createWorker);
	}

	#threads: Thread<any>[];
	#createWorker: WorldConfig['createWorker'];
	constructor(createWorker: WorldConfig['createWorker']) {
		this.#createWorker = createWorker;
		this.#threads = [];
	}

	getThread<T extends object = any>(module: string): Thread<T> {
		const thread = this.#threads.find(thread => thread.module === module);
		if (thread) {
			return thread;
		}
		this.#threads.push(new Thread(this.#createWorker(module), module));
		return this.#threads[this.#threads.length - 1];
	}
}
