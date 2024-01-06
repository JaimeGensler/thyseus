import type { Class } from '../components';
import { Entity } from '../entities';
import type { World } from '../world';

export class EntityCommandQueue {
	#world: World;
	#destinations: Map<Readonly<Entity>, bigint>;
	#inserts: Map<Readonly<Entity>, object[]>;
	#EMPTY: [];

	constructor(world: World) {
		this.#world = world;
		this.#destinations = new Map();
		this.#inserts = new Map();
		this.#EMPTY = [];
	}

	spawn(entity: Readonly<Entity>) {
		this.addType(entity, Entity);
	}

	despawn(entity: Readonly<Entity>) {
		this.#destinations.set(entity, 0n);
	}

	add(entity: Readonly<Entity>, instance: object) {
		const type = instance.constructor as Class;
		this.addType(entity, type);
		const inserts = this.#inserts.get(entity) ?? [];
		inserts.push(instance);
		this.#inserts.set(entity, inserts);
	}

	addType(entity: Readonly<Entity>, type: Class) {
		let val = this.#destinations.get(entity);
		if (val === 0n) {
			return;
		}
		val ??= this.#world.entities.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val | (1n << BigInt(componentId)));
	}

	remove(entity: Readonly<Entity>, type: Class) {
		let val = this.#destinations.get(entity);
		if (val === 0n) {
			return;
		}
		val ??= this.#world.entities.getArchetype(entity);
		const componentId = this.#world.getComponentId(type);
		this.#destinations.set(entity, val ^ (1n << BigInt(componentId)));
	}

	apply(world: World) {
		for (const [entity, archetype] of this.#destinations) {
			const components = this.#inserts.get(entity) ?? this.#EMPTY;
			world.moveEntity(entity as any, archetype, components);
		}
		this.#destinations.clear();
		this.#inserts.clear();
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, vi } = import.meta.vitest;
	const { World } = await import('../world');
	const { Tag } = await import('../components');

	class ZST extends Tag {}
	class CompA {}
	class CompB {}
	class CompC {}
	class CompD {
		x: number;
		y: number;
		constructor(x = 23, y = 42) {
			this.x = x;
			this.y = y;
		}
	}
	const createWorld = async () => {
		const world = new World();
		world.components.push(ZST, CompA, CompB, CompC, CompD);
		return world;
	};

	describe('apply', () => {
		it('moves entities', async () => {
			const world = await createWorld();
			const moveEntitySpy = vi.spyOn(world, 'moveEntity');
			const queue = world.commands.getQueue(EntityCommandQueue);

			const e1Comps = [new CompA(), new CompD()];
			const e2Comps = [new CompB(), new CompD()];
			const { entity: e1 } = world.commands
				.spawn()
				.add(e1Comps[0])
				.add(e1Comps[1]);
			const { entity: e2 } = world.commands
				.spawn()
				.add(e2Comps[0])
				.add(e2Comps[1])
				.addType(ZST);
			const archetype1 = world.getArchetype(CompA, CompD);
			const archetype2 = world.getArchetype(CompB, CompD, ZST);

			queue.apply(world);
			expect(moveEntitySpy).toHaveBeenCalledTimes(2);
			expect(moveEntitySpy).toHaveBeenCalledWith(e1, archetype1, e1Comps);
			expect(moveEntitySpy).toHaveBeenCalledWith(e2, archetype2, e2Comps);
		});
	});
}
