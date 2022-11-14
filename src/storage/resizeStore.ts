import { TYPE_IDS } from '../struct';
import { NAMES_AND_CONSTRUCTORS } from './createStore';
import type { ComponentType, ComponentStore } from './types';
import type { World } from '../World';

export function resizeStore(
	store: ComponentStore,
	ComponentType: ComponentType,
	count: number,
): ComponentStore {
	const newBuffer = new (store.buffer.constructor as ArrayBufferConstructor)(
		ComponentType.size! * count,
	);
	const u8 = new Uint8Array(newBuffer);
	u8.set(store.u8);

	return NAMES_AND_CONSTRUCTORS.reduce(
		(acc, [key, TArray]) => {
			if ((TYPE_IDS[key] & ComponentType.schema!) === TYPE_IDS[key]) {
				acc[key] = new TArray(newBuffer) as any;
			}
			return acc;
		},
		{ buffer: newBuffer, u8 } as ComponentStore,
	);
}
/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('../struct');
	const { createStore } = await import('./createStore');

	@struct()
	class Vec3 {
		declare static schema: number;
		declare static size: number;
		declare __$$s: ComponentStore;
		declare __$$i: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: ComponentStore, index: number) {}
	}

	const mockWorld: World = {
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: () => 8,
		},
	} as any;

	it('returns an object with the same shape', () => {
		const initialStore = createStore(mockWorld, Vec3, 8);
		const resizedStore = resizeStore(initialStore, Vec3, 16);

		expect(initialStore.buffer).not.toBe(resizedStore.buffer);
		expect(initialStore.buffer.byteLength).toBe(Vec3.size * 8);
		expect(resizedStore.buffer.byteLength).toBe(Vec3.size * 16);
		let key: keyof typeof initialStore;
		for (key in initialStore) {
			expect(initialStore[key]!.constructor).toBe(
				resizedStore[key]!.constructor,
			);
		}
	});

	it('copies previous items', () => {
		const initialStore = createStore(mockWorld, Vec3);

		const vec = new Vec3(initialStore, 0);
		const values = [1.2, 0, Math.PI, 3.3, 4.4, 5.5, 6, 7.7];
		values.forEach((val, i) => {
			vec.__$$i = i;
			vec.x = val;
			vec.y = val;
			vec.z = val;
		});

		vec.__$$s = resizeStore(initialStore, Vec3, 16);
		values.forEach((val, i) => {
			vec.__$$i = i;
			expect(vec.x).toBe(val);
			expect(vec.y).toBe(val);
			expect(vec.z).toBe(val);
		});
	});
}
