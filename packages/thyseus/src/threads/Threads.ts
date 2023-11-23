import type { World } from '../world';

import { Thread, type ThreadModule } from './Thread';

/**
 * A resource holding a collection of worker threads in a world.
 * Automatically cleans up workers when `world.stop()` is called.
 *
 * Creates workers using the provided `createWorker` config.
 */
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

	/**
	 * Gets the thread for the provided scriptURL, creating it if it doesn't already exist.
	 * @param scriptURL The URL of the script to get a worker for.
	 * @returns The `Thread` for that script.
	 */
	getThread<T extends ThreadModule = any>(scriptURL: string): Thread<T> {
		let thread = this.#threads.find(thread => thread.module === scriptURL);
		if (!thread) {
			thread = new Thread(this.#createWorker(scriptURL), scriptURL);
			this.#threads.push(thread);
		}
		return thread;
	}
}
