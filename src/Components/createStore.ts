import { createBuffer } from '../utils/createBuffer';
import { typeToBytes, typeToConstructor } from './Type';
import type { Schema, ComponentType, ComponentStore } from './types';
import type { WorldConfig } from '../World/config';

export function createStore<T extends Schema>(
	ComponentType: ComponentType<T>,
	config: WorldConfig,
	count: number,
): ComponentStore<T> {
	const buffer = createBuffer(config, ComponentType.size * count);

	const isArray = Array.isArray(ComponentType.schema);
	let offset = 0;

	return Object.entries(ComponentType.schema).reduce(
		(acc, [stringKey, field], index) => {
			const key = isArray ? index : stringKey;
			acc[key] = new typeToConstructor[field](buffer, offset, count);
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

	it('returns an object with TypedArray keys for each field, using a single buffer', () => {
		class MyComponent extends Component({
			unsigned1: Type.u8,
			unsigned2: Type.u16,
			unsigned3: Type.u32,
			unsigned4: Type.u64,
			int1: Type.i8,
			int2: Type.i16,
			int3: Type.i32,
			int4: Type.i64,
			float1: Type.f32,
			float2: Type.f64,
		}) {}
		const result = createStore(MyComponent, { threads: 1 } as any, 8);

		expect(result.unsigned1).toBeInstanceOf(Uint8Array);
		expect(result.unsigned2).toBeInstanceOf(Uint16Array);
		expect(result.unsigned3).toBeInstanceOf(Uint32Array);
		expect(result.unsigned4).toBeInstanceOf(BigUint64Array);
		expect(result.int1).toBeInstanceOf(Int8Array);
		expect(result.int2).toBeInstanceOf(Int16Array);
		expect(result.int3).toBeInstanceOf(Int32Array);
		expect(result.int4).toBeInstanceOf(BigInt64Array);
		expect(result.float1).toBeInstanceOf(Float32Array);
		expect(result.float2).toBeInstanceOf(Float64Array);

		const buffer = result.unsigned1.buffer;
		for (const key in result) {
			expect(result[key as keyof typeof result].length).toBe(8);
			expect(result[key as keyof typeof result].buffer).toBe(buffer);
		}
	});

	it('returns an Array with TypedArray values, using a single buffer', () => {
		class MyComponent extends Component([
			Type.u8,
			Type.i32,
			Type.f64,
			Type.i64,
		]) {}
		const result = createStore(MyComponent, { threads: 1 } as any, 16);

		expect(Array.isArray(result)).toBe(true);
		expect(result[0]).toBeInstanceOf(Uint8Array);
		expect(result[1]).toBeInstanceOf(Int32Array);
		expect(result[2]).toBeInstanceOf(Float64Array);
		expect(result[3]).toBeInstanceOf(BigInt64Array);

		const buffer = result[0].buffer;
		for (const i of [0, 1, 2, 3]) {
			expect(result[i].length).toBe(16);
			expect(result[i].buffer).toBe(buffer);
		}
	});
}
