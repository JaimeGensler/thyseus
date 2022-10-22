import { createBuffer } from '../utils/createBuffer';
import { typeToBytes, typeToConstructor } from './Type';
import type { Schema, ComponentType, ComponentStore } from './types';
import type { WorldConfig } from '../World/config';

export function resizeStore<T extends Schema>(
	ComponentType: ComponentType<T>,
	config: WorldConfig,
	count: number,
	store: ComponentStore<T>,
): ComponentStore<T> {
	const buffer = createBuffer(config, ComponentType.size * count);

	const isArray = Array.isArray(store);
	let offset = 0;

	return Object.entries(ComponentType.schema).reduce(
		(acc, [stringKey, field], index) => {
			const key = isArray ? index : stringKey;
			acc[key] = new typeToConstructor[field](buffer, offset, count);
			acc[key].set(store[key as keyof typeof store] as any, 0);
			offset += count * typeToBytes[field];
			return acc;
		},
		(isArray ? [] : {}) as ComponentStore<any>,
	);
}
/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { Component } = await import('./Component');
	const { Type } = await import('./Type');
	const { createStore } = await import('./createStore');

	class Vec3 extends Component({
		x: Type.f64,
		y: Type.f64,
		z: Type.f64,
	}) {}

	it('returns an object with the same shape', () => {
		const initialStore = createStore(Vec3, { threads: 1 } as any, 8);
		const resizedStore = resizeStore(
			Vec3,
			{ threads: 1 } as any,
			16,
			initialStore,
		);

		let key: keyof typeof initialStore & keyof typeof resizedStore;
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
		const initialStore = createStore(Vec3, { threads: 1 } as any, 8);

		const values = [0, 1.2, Math.PI, 3.3, 4.4, 5.5, 6, 7.7];
		values.forEach((val, i) => {
			initialStore.x[i] = val;
			initialStore.y[i] = val;
			initialStore.z[i] = val;
		});

		const resizedStore = resizeStore(
			Vec3,
			{ threads: 1 } as any,
			16,
			initialStore,
		);

		values.forEach((val, i) => {
			expect(resizedStore.x[i]).toBe(val);
			expect(resizedStore.y[i]).toBe(val);
			expect(resizedStore.z[i]).toBe(val);
		});
	});
}
