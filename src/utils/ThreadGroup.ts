export type SendableType =
	| void
	| null
	| undefined
	| boolean
	| number
	| string
	| bigint
	| ArrayBuffer
	| SharedArrayBuffer
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array
	| Uint8ClampedArray
	| DataView
	| Date
	| RegExp
	| Blob
	| File
	| FileList
	| ImageBitmap
	| ImageData
	| SendableType[]
	| { [key: string]: SendableType }
	| Map<SendableType, SendableType>
	| Set<SendableType>;

type Listener<I extends SendableType = void, O extends SendableType = void> = (
	data: I,
) => O;
type ThreadMessage = [id: number, channel: string, data: SendableType];
type ThreadMessageEvent = MessageEvent<ThreadMessage> & {
	currentTarget: WorkerOrGlobal;
};
type WorkerOrGlobal = {
	postMessage(content: SendableType): void;
	addEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
	removeEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
};

export class ThreadGroup {
	static isMainThread = !!globalThis.document;
	isMainThread = ThreadGroup.isMainThread;

	static spawn(count: number, url: string | URL | undefined): ThreadGroup {
		return new this(
			ThreadGroup.isMainThread
				? Array.from(
						{ length: count },
						() => new Worker(url!, { type: 'module' }),
				  )
				: [globalThis],
		);
	}

	#nextId = 0;
	#resolvers = new Map<number, (value: any) => void>();
	#listeners = {} as Record<string, Listener<any>>;
	#queue = [] as SendableType[];

	#threads: WorkerOrGlobal[];
	constructor(threads: WorkerOrGlobal[]) {
		this.#threads = threads;

		const handleMessage = ({
			currentTarget,
			data: [id, channel, message],
		}: ThreadMessageEvent) => {
			if (this.#resolvers.has(id)) {
				this.#resolvers.get(id)!(message);
				this.#resolvers.delete(id);
			} else if (channel in this.#listeners) {
				currentTarget.postMessage([
					id,
					channel,
					this.#listeners[channel](message),
				]);
			} else {
				currentTarget.postMessage([id, channel, null]);
			}
		};
		for (const thread of this.#threads) {
			thread.addEventListener('message', handleMessage as any);
		}
	}

	/**
	 * Sets a callback to be called when a message is received on a particular channel.
	 * **NOTE**: Only **one** listener can be set per channel.
	 * @param channel The channel to listen to.
	 * @param listener A callback that is called when a message is received on this channel. The callback receives the content of the message, and its return will be sent in response.
	 */
	setListener<I extends SendableType = void, O extends SendableType = void>(
		channel: string,
		listener: Listener<I, O>,
	) {
		this.#listeners[channel] = listener;
	}

	/**
	 * Deletes the listener for a message channel.
	 * @param channel The channel to unsubscribe from.
	 */
	deleteListener(channel: string) {
		delete this.#listeners[channel];
	}

	/**
	 * Sends a value to a channel.
	 * @param channel The channel to send the value to.
	 * @param message The value to send.
	 * @returns A promise, resolves to an array of results from all threads.
	 */
	send<T extends SendableType = void>(
		channel: string,
		message: SendableType,
	): Promise<T[]> {
		return Promise.all(
			this.#threads.map(thread => {
				const id = this.#nextId++;
				thread.postMessage([id, channel, message]);
				return new Promise<T>(r => this.#resolvers.set(id, r));
			}),
		);
	}

	/**
	 * On the main thread, creates a value, pushes it to the queue, and returns the value.
	 *
	 * On Worker threads, removes and returns the next item in the queue.
	 *
	 * **NOTE:** Queue must be manually sent between threads - use with `ThreadGroup.prototoype.wrapInQueue`.
	 * @param create A function to create the value - only called on the main thread.
	 * @returns The value created by `create` function.
	 */
	queue<T extends SendableType>(create: () => T): T {
		if (ThreadGroup.isMainThread) {
			const val = create();
			this.#queue.push(val);
			return val;
		} else {
			return this.#queue.shift() as T;
		}
	}

	async wrapInQueue<T = void>(callback: () => T | Promise<T>): Promise<T> {
		const channel = '@@';
		let result: T;
		if (this.isMainThread) {
			result = await callback();
			await this.send(channel, this.#queue);
		} else {
			result = await new Promise(resolve =>
				this.setListener<SendableType[]>(channel, queue => {
					this.#queue = queue;
					resolve(callback());
				}),
			);
			this.deleteListener(channel);
		}
		this.#queue.length = 0;
		return result;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, beforeEach } = import.meta.vitest;

	class MockWorker {
		target?: MockWorker;

		handler: any;
		addEventListener(_: 'message', handler: any): this {
			this.handler = handler;
			return this;
		}
		removeEventListener(): void {}
		postMessage(data: any) {
			setTimeout(() => {
				this.target!.handler({ currentTarget: this.target, data });
			}, 10);
		}
	}
	const getMockThreads = () => {
		const mock1 = new MockWorker();
		const mock2 = new MockWorker();
		mock1.target = mock2;
		mock2.target = mock1;
		return [new ThreadGroup([mock1]), new ThreadGroup([mock2])];
	};

	beforeEach(() => {
		ThreadGroup.isMainThread = true;
	});

	it('send returns a promise with an array of results from workers', async () => {
		const [group1, group2] = getMockThreads();
		group2.setListener<number>('add2', data => data + 2);
		group2.setListener<{ x: number }>('set3', data => ({ ...data, x: 3 }));
		expect(await group1.send('add2', 0)).toStrictEqual([2]);
		expect(await group1.send('add2', 1)).toStrictEqual([3]);
		expect(await group1.send('add2', 3.5)).toStrictEqual([5.5]);
		expect(await group1.send('set3', { x: 2 })).toStrictEqual([{ x: 3 }]);
	});

	it('receives null back if no listener is set up', async () => {
		const [group1, group2] = getMockThreads();
		expect(await group1.send('do something!', 0)).toStrictEqual([null]);
		group2.setListener<number>('do something!', n => n * 2);
		expect(await group1.send('do something!', 8)).toStrictEqual([16]);
		group2.deleteListener('do something!');
		expect(await group1.send('do something!', 0)).toStrictEqual([null]);
	});

	it.todo('queue and wrapInQueue works', async () => {});
}
