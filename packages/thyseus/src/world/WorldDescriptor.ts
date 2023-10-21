import type { World } from './World';
import type { SystemParameter } from '../systems';

export class WorldDescriptor implements SystemParameter {
	intoArgument(world: World): World {
		return world;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe('intoArgument', () => {
		it('returns the world', () => {
			const mockWorld: any = {};
			expect(new WorldDescriptor().intoArgument(mockWorld)).toBe(
				mockWorld,
			);
		});
	});
}
