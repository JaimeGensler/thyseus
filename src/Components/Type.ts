import type { TypedArrayConstructor } from './types';

export const typeToBytes = new Map<TypedArrayConstructor, number>();
typeToBytes.set(Uint8Array, 1);
typeToBytes.set(Uint16Array, 2);
typeToBytes.set(Uint32Array, 4);
typeToBytes.set(BigUint64Array, 8);
typeToBytes.set(Int8Array, 1);
typeToBytes.set(Int16Array, 2);
typeToBytes.set(Int32Array, 4);
typeToBytes.set(BigInt64Array, 8);
typeToBytes.set(Float32Array, 4);
typeToBytes.set(Float64Array, 8);
