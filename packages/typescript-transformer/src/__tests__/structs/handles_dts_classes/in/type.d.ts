import { type Store } from 'thyseus';

export declare class Vec3 {
	static readonly size = 24;
	static readonly alignment = 8;
	static readonly boxedSize = 0;
	deserialize(store: Store): void;
	serialize(store: Store): void;
	x: number;
	y: number;
	z: number;
}

export declare class Point extends Vec3 {}
