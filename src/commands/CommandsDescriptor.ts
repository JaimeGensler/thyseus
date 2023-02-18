import type { World, WorldBuilder } from '../world';
import type { Commands } from './Commands';
import type { Descriptor } from '../systems';

export class CommandsDescriptor implements Descriptor {
	isLocalToThread(): boolean {
		return false;
	}
	intersectsWith(other: unknown): boolean {
		return false;
	}
	intoArgument(world: World): Commands {
		return world.commands;
	}
	onAddSystem(builder: WorldBuilder): void {}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;

	describe('intersectsWith', () => {
		it('returns false', () => {
			expect(
				new CommandsDescriptor().intersectsWith(
					new CommandsDescriptor(),
				),
			).toBe(false);
			expect(new CommandsDescriptor().intersectsWith({})).toBe(false);
		});
	});

	describe('onAddSystem', () => {
		it('is a no-op', () => {
			const builder: WorldBuilder = {
				registerComponent: vi.fn(),
				registerResource: vi.fn(),
				registerSendableClass: vi.fn(),
			} as any;
			new CommandsDescriptor().onAddSystem(builder);
			expect(builder.registerComponent).not.toHaveBeenCalled();
			expect(builder.registerResource).not.toHaveBeenCalled();
		});
	});

	describe('isLocalToThread', () => {
		it('returns false', () => {
			expect(new CommandsDescriptor().isLocalToThread()).toBe(false);
		});
	});

	describe('intoArgument', () => {
		it("returns a World's Commands", () => {
			const commands = {};
			expect(
				new CommandsDescriptor().intoArgument({ commands } as any),
			).toBe(commands);
		});
	});
}
