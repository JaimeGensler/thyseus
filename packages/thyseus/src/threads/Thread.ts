import type { World } from '../world';

import { Threads } from './Threads';
import type { StructuredCloneable } from './StructuredCloneable';

type PureFunction = <T extends StructuredCloneable>(...args: T[]) => T;
type PureFunctionKeys<T extends object> = {
	[Key in keyof T]: PureFunction extends T[Key] ? Key : never;
}[keyof T];
type KeysWith<T extends object, U extends any> = {
	[Key in keyof T]: T[Key] extends U ? Key : never;
}[keyof T];
type ArgumentsType<T> = T extends (...args: infer R) => any ? R : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

export class Thread<T extends object> {
	static async intoArgument(
		world: World,
		[importer, scriptURL]: [() => any, string],
	): Promise<Thread<any>> {
		return (await world.getOrCreateResource(Threads)).getThread(scriptURL);
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
	 * Sends a value to the thread, setting the specified variable in that thread.
	 * Note that `SharedArrayBuffer` instances are **shared, not copied**.
	 * You are responsible for managing safe access of `SharedArrayBuffer`s.
	 * @param key The name of the exposed variable to be set in the thread.
	 * @param value The value to set it to.
	 * @returns A promise that resolves when the variable has been successfully set.
	 */
	send<
		K extends KeysWith<T, StructuredCloneable>,
		V extends T[K] & StructuredCloneable,
	>(key: K, value: V): Promise<void> {
		const id = this.#id++;
		this.#worker.postMessage({ key, value, id });
		return new Promise(r => this.#resolvers.set(id, r));
	}

	/**
	 * Transfers a value to the thread, setting the specified variable in that thread.
	 * Only accepts [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).
	 * @param key The name of the exposed variable to be set in the thread.
	 * @param transfer The object to transfer
	 * @returns A promise that resolves when the variable has been successfully transferred.
	 */
	transfer<
		K extends KeysWith<T, Transferable | undefined | null>,
		V extends T[K] & Transferable,
	>(key: K, value: V): Promise<void> {
		const id = this.#id++;
		this.#worker.postMessage({ key, value, id });
		return new Promise(r => this.#resolvers.set(id, r));
	}

	/**
	 * Runs the exposed function on the thread with the provided arguments.
	 * @param key The name of the exposed function to be called in the thread.
	 * @param ...args The arguments to provide the function.
	 * @returns A promise that resolves with the value the thread function returned.
	 */
	run<K extends PureFunctionKeys<T>>(
		key: K,
		...args: ArgumentsType<T[K]>
	): Promise<ReturnType<T[K]>> {
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
