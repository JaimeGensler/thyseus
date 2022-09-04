// Symbols can't be sent to/from workers
const IsSentByThread = '@IS_SENT_BY_THREAD';

interface SendableInstance<T extends SendableType = SendableType> {
	[Thread.Send](): T;
}
export interface SendableClass<T extends SendableType = void> {
	new (...args: any[]): SendableInstance<T>;
	[Thread.Receive](data: T): SendableInstance<T>;
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

const IS_MAIN_THREAD = !!globalThis.document;

export default class Thread {
	static readonly Send = Symbol();
	static readonly Receive = Symbol();

	static Context = {
		Main: IS_MAIN_THREAD,
		Worker: !IS_MAIN_THREAD,
	};

	static globalSendableTypes = [] as SendableClass[];
	#sendableTypes = [] as SendableClass[];

	static spawnBulk(
		count: number,
		url: string | URL | undefined,
		sendableTypes: SendableClass[],
	) {
		if (!Thread.Context.Main) {
			this.globalSendableTypes = sendableTypes;
			return [];
		}
		if (!url) {
			return [];
		}
		return Array.from(
			{ length: count },
			() => new Thread(url, sendableTypes),
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
			return Thread.receive<T>();
		}
	}

	static send(message: SendableType) {
		globalThis.postMessage(serialize(message, this.globalSendableTypes));
		return this;
	}
	static receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				globalThis.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<SendableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.globalSendableTypes) as T);
				globalThis.removeEventListener('message', handler);
			};
			globalThis.addEventListener('message', handler);
		});
	}
	static isSendableClass<T extends SendableType = undefined>(
		x: unknown,
	): x is SendableClass<T> {
		return (
			typeof x === 'function' &&
			Thread.Receive in x &&
			Thread.Send in x.prototype
		);
	}

	#worker: Worker;
	constructor(scriptURL: string | URL, sendableTypes: SendableClass[]) {
		this.#worker = new Worker(scriptURL, { type: 'module' });
		this.#sendableTypes = sendableTypes;
	}

	send(message: SendableType) {
		this.#worker.postMessage(serialize(message, this.#sendableTypes));
		return this;
	}
	receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				this.#worker.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<SendableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.#sendableTypes) as T);
				this.#worker.removeEventListener('message', handler);
			};
			this.#worker.addEventListener('message', handler);
		});
	}
}

function isSendableInstance(val: object): val is SendableInstance {
	return Thread.Send in val;
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
			serialize(value[Thread.Send](), sendableTypes),
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
		return TypeConstructor[Thread.Receive](deserializedData as any);
	}
	for (const key in value) {
		//@ts-ignore
		value[key] = deserialize(value[key], sendableTypes);
	}
	return value;
}
