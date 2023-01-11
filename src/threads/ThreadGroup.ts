import {
	createThreadChannel,
	type ThreadMessage,
	type SendableType,
} from './createThreadChannel';

type Listener = (...data: SendableType[]) => SendableType;
type ThreadMessageEvent = MessageEvent<ThreadMessage<SendableType[], any>> & {
	currentTarget: WorkerOrGlobal;
};
type WorkerOrGlobal = {
	postMessage(content: SendableType): void;
	addEventListener(
		type: 'message',
		fn: (event: ThreadMessageEvent) => void,
	): void;
	removeEventListener(
		type: 'message',
		fn: (event: ThreadMessageEvent) => void,
	): void;
};

const EMPTY: [] = [];
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

	#resolvers = new Map<number, (value: any) => void>();
	#resolvedData = new Map<number, SendableType[]>();
	#listeners = {} as Record<string, Listener>;
	#queue = [] as SendableType[];

	#threads: WorkerOrGlobal[];
	constructor(threads: WorkerOrGlobal[]) {
		this.#threads = threads;

		const handleMessage = ({
			currentTarget,
			data: [channel, id, message],
		}: ThreadMessageEvent) => {
			if (this.#resolvers.has(id)) {
				const data = this.#resolvedData.get(id)!;
				data.push(message);
				if (data.length === this.#threads.length) {
					this.#resolvers.get(id)!(data);
					this.#resolvers.delete(id);
					this.#resolvedData.delete(id);
				}
			} else if (channel in this.#listeners) {
				currentTarget.postMessage([
					channel,
					id,
					this.#listeners[channel](...message),
				]);
			} else {
				currentTarget.postMessage([channel, id, null]);
			}
		};
		for (const thread of this.#threads) {
			thread.addEventListener('message', handleMessage);
		}
	}

	setListener<I extends SendableType[], O extends SendableType>(
		channelName: string,
		listener: (...args: I) => O,
	) {
		this.#listeners[channelName] = listener as any;
	}
	deleteListener(channelName: string) {
		delete this.#listeners[channelName];
	}

	/**
	 * Sends a value to a channel.
	 * @param channel The channel to send the value to.
	 * @param message The value to send.
	 * @returns A promise, resolves to an array of results from all threads.
	 */
	send<T>(message: ThreadMessage<any, T>): Promise<T[]> {
		if (this.#threads.length === 0) {
			return Promise.resolve(EMPTY);
		}
		return new Promise(r => {
			for (const thread of this.#threads) {
				thread.postMessage(message);
			}
			this.#resolvedData.set(message[1], []);
			this.#resolvers.set(message[1], r);
		});
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
		}
		return this.#queue.shift() as T;
	}

	async wrapInQueue<T = void>(callback: () => T | Promise<T>): Promise<T> {
		const channel = 'threadGroup::queue';
		let result: T;
		if (this.isMainThread) {
			result = await callback();
			await this.send([channel, 0, [this.#queue]]);
		} else {
			result = await new Promise(resolve =>
				this.setListener(channel, (queue: any) => {
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
		const add2 = createThreadChannel(
			'add2',
			() => (data: number) => data + 2,
		);
		const set3 = createThreadChannel(
			'set3',
			() => (data: { x: number }) => ({
				...data,
				x: 3,
			}),
		);
		group2.setListener(add2.channelName, add2.onReceive({} as any));
		group2.setListener(set3.channelName, set3.onReceive({} as any));
		expect(await group1.send(add2(0))).toStrictEqual([2]);
		expect(await group1.send(add2(1))).toStrictEqual([3]);
		expect(await group1.send(add2(3.5))).toStrictEqual([5.5]);
		expect(await group1.send(set3({ x: 2 }))).toStrictEqual([{ x: 3 }]);
	});

	it('receives null back if no listener is set up', async () => {
		const [group1, group2] = getMockThreads();
		expect(await group1.send(['do something!', 0, []])).toStrictEqual([
			null,
		]);
		group2.setListener('do something!', (n: number) => n * 2);
		expect(await group1.send(['do something!', 1, [8]])).toStrictEqual([
			16,
		]);
		group2.deleteListener('do something!');
		expect(await group1.send(['do something!', 2, [0]])).toStrictEqual([
			null,
		]);
	});

	it.todo('queue and wrapInQueue works', async () => {});
}
