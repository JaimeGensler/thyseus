import { DEV_ASSERT } from '../utils';
import { World } from './World';
import { Entity } from '../entities';
import { DefaultSchedule } from '../schedules';
import { ComponentRegistryKey, ResourceRegistryKey } from './registryKeys';
import type { Class, Struct } from '../struct';
import type { Plugin } from './Plugin';
import type { System } from '../systems';
import type { WorldConfig } from './config';

export type Registry = Map<symbol, Set<any>>;
export class WorldBuilder {
	#schedules: Map<symbol, System[]> = new Map();

	#registry: Registry = new Map();

	#systems: Set<System> = new Set();

	config: Readonly<WorldConfig>;
	constructor(config: WorldConfig) {
		this.config = config;
		this.registerComponent(Entity);
	}

	/**
	 * Adds systems to the default schedule of the world (`CoreSchedule.Main`).
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(...systems: System[]): this {
		this.addSystemsToSchedule(DefaultSchedule, ...systems);
		return this;
	}

	/**
	 * Adds systems to the specified schedule.
	 * @param schedule The schedule to add the systems to.
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystemsToSchedule(schedule: symbol, ...systems: System[]): this {
		for (const system of systems.flat()) {
			this.#addSystemToSchedule(schedule, system);
		}
		return this;
	}

	/**
	 * Adds a system to the specified schedule.
	 * @param schedule The schedule to add the system to.
	 * @param systemLike The system to add.
	 * @returns `this`, for chaining.
	 */
	#addSystemToSchedule(schedule: symbol, system: System): this {
		if (!this.#schedules.has(schedule)) {
			this.#schedules.set(schedule, []);
		}
		this.#systems.add(system);
		if (system.parameters) {
			for (const descriptor of system.parameters) {
				descriptor.onAddSystem(this);
			}
		}
		DEV_ASSERT(
			// We allow a mismatch here so long as systems receive at least
			// as many parameters as its length. Fewer than the length is
			// probably the result of a failed transformation, but more than
			// the length could just be the result of handwritten params.
			(system.parameters?.length ?? 0) >= system.length,
			`System "${system.name}" expects ${
				system.length
			} parameters, but will receive ${
				system.parameters?.length ?? 0
			}. This is likely due to a failed transformation.`,
		);
		this.#schedules.get(schedule)!.push(system);
		return this;
	}

	/**
	 * Passes this WorldBuilder to the provided plugin function.
	 * @param plugin The plugin to pass this WorldBuilder to.
	 * @returns `this`, for chaining.
	 */
	addPlugin(plugin: Plugin): this {
		plugin(this);
		return this;
	}

	/**
	 * Adds an item (_of any type_) to the registry under a specific collection.
	 * Identical items are deduplicated.
	 * @param symbol The key of the collection to register the provided item to.
	 * @param item The item to register.
	 * @returns `this`, for chaining.
	 */
	register(registryKey: symbol, item: any): this {
		if (!this.#registry.has(registryKey)) {
			this.#registry.set(registryKey, new Set());
		}
		this.#registry.get(registryKey)!.add(item);
		return this;
	}

	/**
	 * Registers a component type in the world.
	 * Called automatically for all queried components when a system is added.
	 * @param componentType The componentType (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(componentType: Struct): this {
		return this.register(ComponentRegistryKey, componentType);
	}

	/**
	 * Registers a resource type in the world.
	 * Called automatically for all accessed resources when a system is added.
	 * @param resourceType The Resource type (`Class`) to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(resourceType: Class): this {
		return this.register(ResourceRegistryKey, resourceType);
	}

	/**
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const world = new World(this.config, this.#registry);
		for (const resourceType of this.#registry.get(ResourceRegistryKey) ??
			[]) {
			const res = (resourceType as any).fromWorld
				? await (resourceType as any).fromWorld(world)
				: new resourceType();
			world.resources.push(res);
		}
		const systemArguments = new Map();
		for (const system of this.#systems) {
			systemArguments.set(
				system,
				await Promise.all(
					system.parameters?.map(parameter =>
						parameter.intoArgument(world),
					) ?? [],
				),
			);
		}
		for (const [scheduleSymbol, systems] of this.#schedules) {
			world.schedules[scheduleSymbol] = {
				systems,
				args: systems.map(s => systemArguments.get(s)),
			};
		}

		return world;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const fromWorldSpy = vi.fn();
	class Time {
		static fromWorld = fromWorldSpy;
	}

	it('calls onAddSystem for all parameters', () => {
		const builder = World.new();
		const spy1 = vi.fn();
		const spy2 = vi.fn();
		const spy3 = vi.fn();
		const spy4 = vi.fn();
		function mockSystem1() {}
		mockSystem1.parameters = [
			{ onAddSystem: spy1 },
			{ onAddSystem: spy2 },
		] as any;
		function mockSystem2() {}
		mockSystem2.parameters = [
			{ onAddSystem: spy3 },
			{ onAddSystem: spy4 },
		] as any;
		builder.addSystems(mockSystem1, mockSystem2);
	});

	it('uses fromWorld to construct resources if it exists', async () => {
		const builder = World.new().registerResource(Time);
		expect(fromWorldSpy).not.toHaveBeenCalled();
		const world = await builder.build();
		expect(fromWorldSpy).toHaveBeenCalledWith(world);
	});

	it('adds Entity component to systems', async () => {
		const world = await World.new().build();
		expect(world.components).toStrictEqual([Entity]);
	});

	it.todo('constructs struct resources correctly', async () => {
		const serializeSpy = vi.fn();
		class StructClass {
			static size = 1;
			static alignment = 1;
			deserialize() {}
			serialize = serializeSpy;
		}
		expect(serializeSpy).not.toHaveBeenCalled();
		const world = await World.new().registerResource(StructClass).build();
		expect(world.resources[0]).toBeInstanceOf(StructClass);
		expect(serializeSpy).toHaveBeenCalledOnce();
	});
}
