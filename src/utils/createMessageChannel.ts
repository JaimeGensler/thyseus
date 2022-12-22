import type { World } from '../World';

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

type OnReceive<I extends SendableType[], O extends SendableType> = (
	world: World,
) => (...data: I) => O;

export type ThreadMessage<I extends SendableType[], O> = [string, number, I];
export type ThreadMessageChannel<
	I extends SendableType[] = [],
	O extends SendableType = void,
> = {
	(...data: I): ThreadMessage<I, O>;
	channelName: string;
	onReceive: OnReceive<I, O>;
};

let messageCount = 1;
export function createMessageChannel<
	I extends SendableType[],
	O extends SendableType,
>(channelName: string, onReceive: OnReceive<I, O>): ThreadMessageChannel<I, O> {
	function messageCreator(...args: I) {
		return [channelName, messageCount++, args];
	}
	messageCreator.channelName = channelName;
	messageCreator.onReceive = onReceive;
	return messageCreator as any;
}
