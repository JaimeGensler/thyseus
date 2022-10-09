export const fourBytes = 32n;
const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;

export const getIndex = (id: bigint): number => Number(id & lo32);
export const getGeneration = (id: bigint): number => Number(id >> fourBytes);
