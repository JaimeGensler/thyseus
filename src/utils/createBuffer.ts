import { WorldConfig } from '../World/config';

export default function createBuffer(
	config: WorldConfig,
	size: number,
): ArrayBufferLike {
	return new (config.threads > 1 ? SharedArrayBuffer : ArrayBuffer)(size);
}
