export type PredicateRule<I = any, O extends I = I> = (value: I) => value is O;
export type BooleanRule<I = any> = (value: I) => boolean;
export type Rule<I = any, O extends I = any> =
	| PredicateRule<I, O>
	| BooleanRule<I>;

export function NOT<T extends Rule>(rule: T): T {
	return (value => !rule(value)) as T;
}

export function AND<I, O extends I>(
	...rules: [PredicateRule<I, O>, ...Rule<O, O>[]]
): PredicateRule<I, O>;
export function AND<I, O extends I>(...rules: Rule<I, O>[]): Rule<I, O>;
export function AND(...rules: Rule[]) {
	//@ts-ignore
	return value => rules.every(rule => rule(value));
}

export function OR<I = any>(...rules: BooleanRule<I>[]): Rule<I, I> {
	return value => rules.some(rule => rule(value));
}
