import { bits } from '../../utils/bits';

export function overlaps(arr: Uint8Array, big: bigint, mode: 0 | 1): boolean {
	for (const bit of bits(big)) {
		if (arr[bit] === mode) {
			return false;
		}
	}
	return true;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	it('returns true if all bit indices are set, false otherwise', () => {
		expect(overlaps(Uint8Array.from([0]), 0b0n, 0)).toBe(true);
		expect(overlaps(Uint8Array.from([0, 0, 1, 0]), 0b0100n, 0)).toBe(true);
		expect(overlaps(Uint8Array.from([1, 0, 1, 1]), 0b1101n, 0)).toBe(true);
		expect(overlaps(Uint8Array.from([1, 1, 1, 1]), 0b1101n, 0)).toBe(true);

		expect(overlaps(Uint8Array.from([0]), 0b1n, 0)).toBe(false);
		expect(overlaps(Uint8Array.from([1, 1, 1, 0]), 0b1111n, 0)).toBe(false);
	});

	it('returns true if no bits in common, false otherwise', () => {
		expect(overlaps(Uint8Array.from([0]), 0b1n, 1)).toBe(true);
		expect(overlaps(Uint8Array.from([0, 1, 1, 0]), 0b1001n, 1)).toBe(true);

		expect(overlaps(Uint8Array.from([0, 0, 1, 0]), 0b0100n, 1)).toBe(false);
		expect(overlaps(Uint8Array.from([1, 1, 1, 0]), 0b1111n, 0)).toBe(false);
	});
}
