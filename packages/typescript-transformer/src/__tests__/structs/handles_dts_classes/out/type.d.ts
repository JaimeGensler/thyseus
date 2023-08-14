export declare class Vec3 {
	static readonly size = 24;
	static readonly alignment = 8;
	deserialize(): void;
	serialize(): void;
	x: number;
	y: number;
	z: number;
}
export declare class Point extends Vec3 {}
