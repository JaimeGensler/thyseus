export function zipIntoMap<A, B>(a: Iterable<A>, b: Iterable<B>): Map<A, B> {
	const arrB = [...b];
	return [...a].reduce(
		(acc, aElement, i) => acc.set(aElement, arrB[i]),
		new Map(),
	);
}
