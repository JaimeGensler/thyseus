import type { World } from '../world';
import type { Commands } from './Commands';
import type { SystemParameter } from '../systems';

export class CommandsDescriptor implements SystemParameter {
	intoArgument({ commands }: World): Commands {
		return commands;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe('intoArgument', () => {
		it("returns a World's Commands", () => {
			const commands = {};
			expect(
				new CommandsDescriptor().intoArgument({ commands } as any),
			).toBe(commands);
		});
	});
}
