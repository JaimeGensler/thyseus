import { typeToBytes } from './Type';
import type { Schema, ComponentType, ComponentStore } from './types';
import type { World } from '../World';

export function resizeStore<T extends Schema>(
	world: World,
	ComponentType: ComponentType<T>,
	count: number,
	store: ComponentStore<T>,
): ComponentStore<T> {
	const buffer = world.createBuffer(ComponentType.size * count);

	let offset = 0;

	return Object.entries(ComponentType.schema).reduce(
		(acc, [key, FieldConstructor]) => {
			acc[key] = new FieldConstructor(buffer, offset, count);
			acc[key].set(store[key as keyof typeof store] as any, 0);
			offset += count * typeToBytes.get(FieldConstructor)!;
			return acc;
		},
		{} as ComponentStore<any>,
	);
}
/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('./struct');
	const { createStore } = await import('./createStore');

	@struct()
	class Vec3 {
		static schema = {};
		static size = 0;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
	}

	const mockWorld = {
		createBuffer: (l: number) => new ArrayBuffer(l),
	} as World;

	it('returns an object with the same shape', () => {
		const initialStore = createStore<any>(mockWorld, Vec3, 8);
		const resizedStore = resizeStore<any>(
			mockWorld,
			Vec3,
			16,
			initialStore,
		);

		let key: any;
		for (key in initialStore) {
			expect(initialStore[key].constructor).toBe(
				resizedStore[key].constructor,
			);
			expect(initialStore[key]).toHaveLength(8);
			expect(resizedStore[key]).toHaveLength(16);
		}
		expect(initialStore.x.buffer).not.toBe(resizedStore.x.buffer);
	});

	it('copies previous items', () => {
		const initialStore = createStore<any>(mockWorld, Vec3, 8);

		const values = [0, 1.2, Math.PI, 3.3, 4.4, 5.5, 6, 7.7];
		values.forEach((val, i) => {
			initialStore.x[i] = val;
			initialStore.y[i] = val;
			initialStore.z[i] = val;
		});

		const resizedStore = resizeStore(mockWorld, Vec3, 16, initialStore);

		values.forEach((val, i) => {
			expect(resizedStore.x[i]).toBe(val);
			expect(resizedStore.y[i]).toBe(val);
			expect(resizedStore.z[i]).toBe(val);
		});
	});
}
