export function* bits(val: bigint) {
	let i = 0;
	while (val !== 0n) {
		if ((val & 1n) === 1n) {
			yield i;
		}
		val >>= 1n;
		i++;
	}
}
