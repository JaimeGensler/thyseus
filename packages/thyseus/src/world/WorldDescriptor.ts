import type { World } from './World';
import type { WorldBuilder } from './WorldBuilder';
import type { SystemParameter } from '../systems';

export class WorldDescriptor implements SystemParameter {
	isLocalToThread(): boolean {
		return true;
	}
	intersectsWith(other: unknown): boolean {
		return true;
	}
	intoArgument(world: World): World {
		return world;
	}
	onAddSystem(builder: WorldBuilder): void {}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;

	describe('intersectsWith', () => {
		it('returns true', () => {
			expect(
				new WorldDescriptor().intersectsWith(new WorldDescriptor()),
			).toBe(true);
			expect(new WorldDescriptor().intersectsWith({})).toBe(true);
		});
	});

	describe('onAddSystem', () => {
		it('is a no-op', () => {
			const builder: WorldBuilder = {
				registerComponent: vi.fn(),
				registerResource: vi.fn(),
				registerSendableClass: vi.fn(),
			} as any;
			new WorldDescriptor().onAddSystem(builder);
			expect(builder.registerComponent).not.toHaveBeenCalled();
			expect(builder.registerResource).not.toHaveBeenCalled();
		});
	});

	describe('isLocalToThread', () => {
		it('returns true', () => {
			expect(new WorldDescriptor().isLocalToThread()).toBe(true);
		});
	});

	describe('intoArgument', () => {
		it('returns the world', () => {
			const mockWorld: any = {};
			expect(new WorldDescriptor().intoArgument(mockWorld)).toBe(
				mockWorld,
			);
		});
	});
}
