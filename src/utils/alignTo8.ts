export function alignTo8(x: number): number {
	return (x + 7) & ~7;
}
