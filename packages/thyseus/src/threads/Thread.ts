import type { World } from '../world';

import { Threads } from './Threads';
import type { Exposeable } from './expose';

export type ThreadModule = {
	default: Exposeable;
};
type KeysWith<T extends Exposeable, U extends any> = {
	[Key in keyof T]: T[Key] extends U ? Key : never;
}[keyof T];
type ArgumentsType<T> = T extends (...args: infer R) => any ? R : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

/**
 * A wrapper over the `Worker` object to handle message passing.
 */
export class Thread<T extends ThreadModule> {
	static async intoArgument(
		world: World,
		[importer, scriptURL]: [() => any, string],
	): Promise<Thread<any>> {
		return (await world.getResource(Threads)).getThread(scriptURL);
	}

	#worker: Worker;
	#id: number;
	#resolvers: Map<number, (args: any) => void>;

	module: string;

	constructor(worker: Worker, module: string) {
		this.module = module;
		this.#worker = worker;
		this.#resolvers = new Map();
		this.#id = 0;
		this.#worker.addEventListener('message', message => {
			const { id, result } = message.data;
			const resolver = this.#resolvers.get(id)!;
			resolver(result);
			this.#resolvers.delete(id);
		});
	}

	/**
	 * Transfers a value to the thread, setting the specified variable in that thread.
	 * Only accepts [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).
	 * @param key The name of the exposed variable to be set in the thread.
	 * @param transfer The object to transfer
	 * @returns A promise that resolves when the variable has been successfully transferred.
	 */
	// transfer<
	// 	K extends KeysWith<T['default'], (value: Transferable) => any>,
	// 	V extends any,
	// 	// V extends T['default'][K] & Transferable,
	// >(key: K, value: V): Promise<void> {
	// 	const id = this.#id++;
	// 	this.#worker.postMessage({ key, value, id }, [value]);
	// 	return new Promise(r => this.#resolvers.set(id, r));
	// }

	/**
	 * Calls the exposed function on the thread with the provided arguments.
	 * @param key The name of the exposed function to be called in the thread.
	 * @param ...args The arguments to provide the function.
	 * @returns A promise that resolves with the value the thread function returned.
	 */
	call<K extends KeysWith<T['default'], Function>>(
		key: K,
		...args: ArgumentsType<T['default'][K]>
	): Promise<ReturnType<T['default'][K]>> {
		const id = this.#id++;
		this.#worker.postMessage({ key, value: args, id });
		return new Promise(r => this.#resolvers.set(id, r));
	}

	/**
	 * Stops the worker.
	 * The worker will not have an opportunity to finish any ongoing operations; it will be terminated at once.
	 */
	terminate() {
		this.#worker.terminate();
	}
}
