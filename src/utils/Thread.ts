// Symbols can't be sent to/from workers
const IsSentByThread = '@IS_SENT_BY_THREAD';

interface SendableInstance<T extends SendableType = SendableType> {
	[ThreadProtocol.Send](): T;
}
export interface SendableClass<T extends SendableType = void> {
	new (...args: any[]): SendableInstance<T>;
	[ThreadProtocol.Receive](data: T): SendableInstance<T>;
}
type SentInstance = [typeof IsSentByThread, number, SendableType];

export type SendableType =
	| void
	| null
	| undefined
	| boolean
	| number
	| string
	| bigint
	| Date
	| RegExp
	| Blob
	| File
	| FileList
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
	| Float32Array
	| Uint8ClampedArray
	| DataView
	| ImageBitmap
	| ImageData
	| SendableType[]
	| { [key: string]: SendableType }
	| Map<SendableType, SendableType>
	| Set<SendableType>
	| SendableInstance;

interface WorkerOrGlobal {
	postMessage(content: any): void;
	addEventListener(type: 'message', fn: Function): void;
	removeEventListener(type: 'message', fn: Function): void;
}

const Send = Symbol();
const Receive = Symbol();

export const ThreadProtocol = {
	Send,
	Receive,
} as const;

export default class Thread {
	static Context = {
		Main: !!globalThis.document,
		Worker: !globalThis.document,
	};

	static spawn(
		count: number,
		url: string | URL | undefined,
		sendableTypes: SendableClass[],
	) {
		if (!url || count === 0) {
			return [];
		}
		if (!Thread.Context.Main) {
			return [new this(globalThis, sendableTypes)];
		}
		return Array.from(
			{ length: count },
			() => new this(new Worker(url, { type: 'module' }), sendableTypes),
		);
	}
	static execute(context: boolean, fn: () => void) {
		if (context) {
			fn();
		}
	}

	static async createOrReceive<T extends SendableType>(
		context: boolean,
		threads: Thread[],
		create: () => T,
	): Promise<T> {
		if (context) {
			const result = create();
			threads.forEach(thread => thread.send(result));
			return result;
		} else {
			const res = await Promise.all(
				threads.map(thread => thread.receive<T>()),
			);
			return res[0];
		}
	}

	#handler: WorkerOrGlobal;
	#sendableTypes: SendableClass[];
	constructor(handler: WorkerOrGlobal, sendableTypes: SendableClass[]) {
		this.#handler = handler;
		this.#sendableTypes = sendableTypes;
	}

	send(message: SendableType) {
		this.#handler.postMessage(serialize(message, this.#sendableTypes));
		return this;
	}
	receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				this.#handler.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<SendableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.#sendableTypes) as T);
				this.#handler.removeEventListener('message', handler);
			};
			this.#handler.addEventListener('message', handler);
		});
	}
}

export function isSendableClass<T extends SendableType = undefined>(
	x: unknown,
): x is SendableClass<T> {
	return (
		typeof x === 'function' &&
		ThreadProtocol.Receive in x &&
		ThreadProtocol.Send in x.prototype
	);
}
function isSendableInstance(val: object): val is SendableInstance {
	return ThreadProtocol.Send in val;
}
function isSentInstance(val: object): val is SentInstance {
	return Array.isArray(val) && val.length === 3 && val[0] === IsSentByThread;
}

function serialize(
	value: SendableType,
	sendableTypes: SendableClass[],
): unknown {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (isSendableInstance(value)) {
		return [
			IsSentByThread,
			sendableTypes.indexOf(Object.getPrototypeOf(value).constructor),
			serialize(value[ThreadProtocol.Send](), sendableTypes),
		];
	}
	for (const key in value) {
		//@ts-ignore
		value[key] = serialize(value[key], sendableTypes);
	}
	return value;
}

function deserialize(
	value: SendableType,
	sendableTypes: SendableClass[],
): unknown {
	if (
		typeof value !== 'object' ||
		value === null ||
		value instanceof Object.getPrototypeOf(Uint8Array) ||
		value instanceof DataView ||
		value instanceof ArrayBuffer ||
		(typeof SharedArrayBuffer !== undefined &&
			value instanceof SharedArrayBuffer)
	) {
		return value;
	}
	if (isSentInstance(value)) {
		const [, typeKey, data] = value;
		const deserializedData = deserialize(data, sendableTypes);
		const TypeConstructor = sendableTypes[typeKey];
		return TypeConstructor[ThreadProtocol.Receive](deserializedData as any);
	}
	for (const key in value) {
		//@ts-ignore
		value[key] = deserialize(value[key], sendableTypes);
	}
	return value;
}
