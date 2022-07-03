// Symbols can't be sent to/from workers
const IsShared = '@IS_SHARED';

interface ShareableInstance<T extends ShareableType = ShareableType> {
	[Thread.Send](): T;
}
interface ShareableClass<T extends ShareableType = ShareableType> {
	// If I want constructors to be able to be marked as private, then...
	new (...args: any[]): ShareableInstance<T>;
	[Thread.Receive](data: T): ShareableInstance<T>;
}
interface SharedInstance {
	[IsShared]: [number, ShareableType];
}
export type ShareableType =
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
	| ShareableType[]
	| { [key: string]: ShareableType }
	| Map<ShareableType, ShareableType>
	| Set<ShareableType>
	| ShareableInstance;

export default class Thread extends Worker {
	static readonly Send = Symbol();
	static readonly Receive = Symbol();

	static globalSharedTypes: ShareableClass[] = [];
	#sharedTypes: ShareableClass[] = [];

	static send(message: ShareableType) {
		globalThis.postMessage(serialize(message, this.globalSharedTypes));
		return this;
	}
	static receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				globalThis.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<ShareableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.globalSharedTypes) as T);
				globalThis.removeEventListener('message', handler);
			};
			globalThis.addEventListener('message', handler);
		});
	}

	constructor(scriptURL: string | URL, sharedTypes: ShareableClass[]) {
		super(scriptURL, { type: 'module' });
		this.#sharedTypes = sharedTypes;
	}

	send(message: ShareableType) {
		super.postMessage(serialize(message, this.#sharedTypes));
		return this;
	}
	receive<T extends any = unknown>(timeout = 3000) {
		return new Promise<T>((resolve, reject) => {
			let timerId = setTimeout(() => {
				reject('Timed out.');
				this.removeEventListener('message', handler);
			}, timeout);
			const handler = (e: MessageEvent<ShareableType>) => {
				clearTimeout(timerId);
				resolve(deserialize(e.data, this.#sharedTypes) as T);
				this.removeEventListener('message', handler);
			};
			this.addEventListener('message', handler);
		});
	}
}

function isShareableInstance(val: object): val is ShareableInstance {
	return Thread.Send in val;
}
function isSharedInstance(val: object): val is SharedInstance {
	return IsShared in val;
}

function serialize(
	value: ShareableType,
	sharedTypes: ShareableClass[],
): unknown {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (isShareableInstance(value)) {
		return {
			[IsShared]: [
				sharedTypes.indexOf(Object.getPrototypeOf(value).constructor),
				serialize(value[Thread.Send](), sharedTypes),
			],
		};
	}
	for (const key in value) {
		//@ts-ignore
		value[key] = serialize(value[key], sharedTypes);
	}
	return value;
}
function deserialize(
	value: ShareableType,
	sharedTypes: ShareableClass[],
): unknown {
	if (typeof value !== 'object' || value === null) {
		return value;
	}
	if (isSharedInstance(value)) {
		const [typeKey, data] = value[IsShared];
		const deserializedData = deserialize(data, sharedTypes);
		const TypeConstructor = sharedTypes[typeKey];
		return TypeConstructor[Thread.Receive](deserializedData as any);
	}
	for (const key in value) {
		//@ts-ignore
		value[key] = deserialize(value[key], sharedTypes);
	}
	return value;
}
