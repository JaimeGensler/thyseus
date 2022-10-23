const Send = Symbol('Thread::Send');
const Receive = Symbol('Thread::Receive');
export const ThreadProtocol = {
	Send,
	Receive,
} as const;

type StructuredCloneable =
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
	| ImageData;
export type SendableType =
	| StructuredCloneable
	| Map<StructuredCloneable, StructuredCloneable>
	| Set<StructuredCloneable>
	| SendableType[]
	| { [key: string]: SendableType }
	| SendableInstance;

interface SendableInstance<T extends SendableType = SendableType> {
	[ThreadProtocol.Send](): T;
}
export interface SendableClass<T extends SendableType = void> {
	new (...args: any[]): SendableInstance<T>;
	[ThreadProtocol.Receive](data: T): SendableInstance<T>;
}
