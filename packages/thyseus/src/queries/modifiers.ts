import { Class } from '../components';
import { World } from '../world';

/**
 * A type that may or may not be present.
 */
export type Maybe<T> = T | undefined;
export const Maybe = {
	intoArgument(_: World, type: Class) {
		return { modifier: 'maybe', type };
	},
	isMaybe(value: any): value is { modifier: string; type: Class } {
		return typeof value === 'object' && value.modifier === 'maybe';
	},
};

export type AccessorDescriptor = Class | { modifier: string; type: Class };
export type Accessor = Maybe<object>;

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	class MyComponent {}

	describe('Maybe', () => {
		it('intoArgument() returns a maybe descriptor', () => {
			expect(Maybe.intoArgument({} as any, MyComponent)).toStrictEqual({
				modifier: 'maybe',
				type: MyComponent,
			});
		});
		it('isMaybe() returns true iff a value is a maybe descriptor', () => {
			const maybeComp = Maybe.intoArgument({} as any, MyComponent);
			expect(Maybe.isMaybe(maybeComp)).toBe(true);
			expect(Maybe.isMaybe(MyComponent)).toBe(false);
		});
	});
}
