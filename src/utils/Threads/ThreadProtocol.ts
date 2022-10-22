const Send = Symbol('Thread::Send');
const Receive = Symbol('Thread::Receive');
export const ThreadProtocol = {
	Send,
	Receive,
} as const;

export type Primitive =
	| void
	| null
	| undefined
	| boolean
	| number
	| string
	| bigint;
export type BinaryView =
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
	| DataView;
type StructuredCloneable =
	| Primitive
	| BinaryView
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

export interface SendableInstance<T extends SendableType = SendableType> {
	[ThreadProtocol.Send](): T;
}
export interface SendableClass<T extends SendableType = void> {
	new (...args: any[]): SendableInstance<T>;
	[ThreadProtocol.Receive](data: T): SendableInstance<T>;
}
