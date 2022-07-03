// Symbols can't be sent to/from workers
const IsSentByThread = '@IS_SENT_BY_THREAD';

export interface SendableInstance<T extends SendableType = SendableType> {
	[Thread.Send](): T;
}
export interface SendableClass<T extends SendableType = SendableType> {
	new (...args: any[]): SendableInstance<T>;
	[Thread.Receive](data: T): SendableInstance<T>;
}
interface SentInstance {
	[IsSentByThread]: [number, SendableType];
}
export type SendableType =
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
	| object
	| SendableType[]
	| { [key: string]: SendableType }
	| Map<SendableType, SendableType>
	| Set<SendableType>
	| SentInstance;

export default class Thread extends Worker {
	static readonly Send = Symbol();
	static readonly Receive = Symbol();

	static globalSendableTypes: SendableClass[] = [];
	#sendableTypes: SendableClass[] = [];

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
	static isSendableClass(x: Function): x is SendableClass {
		return Thread.Receive in x && Thread.Send in x.prototype;
	}

	constructor(scriptURL: string | URL, sendableTypes: SendableClass[]) {
		super(scriptURL, { type: 'module' });
		this.#sendableTypes = sendableTypes;
	}

	send(message: SendableType) {
		super.postMessage(serialize(message, this.#sendableTypes));
		return this;
	}
	receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				this.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<SendableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.#sendableTypes) as T);
				this.removeEventListener('message', handler);
			};
			this.addEventListener('message', handler);
		});
	}
}

function isSendableInstance(val: object): val is SendableInstance {
	return Thread.Send in val;
}
function isSentInstance(val: object): val is SentInstance {
	return IsSentByThread in val;
}

function serialize(
	value: SendableType,
	sendableTypes: SendableClass[],
): unknown {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (isSendableInstance(value)) {
		return {
			[IsSentByThread]: [
				sendableTypes.indexOf(Object.getPrototypeOf(value).constructor),
				serialize(value[Thread.Send](), sendableTypes),
			],
		};
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
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (isSentInstance(value)) {
		const [typeKey, data] = value[IsSentByThread];
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
