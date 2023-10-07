export type StructuredCloneable =
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
	| StructuredCloneable[]
	| { [key: string]: StructuredCloneable }
	| Map<StructuredCloneable, StructuredCloneable>
	| Set<StructuredCloneable>;
