import { DEV_ASSERT } from '../utils';
import { World } from './World';
import { Entity } from '../entities';
import { DefaultSchedule } from '../schedules';
import {
	CommandRegistryKey,
	ComponentRegistryKey,
	ResourceRegistryKey,
} from './registryKeys';
import type { Class, Struct } from '../components';
import type { Plugin } from './Plugin';
import type { System } from '../systems';
import type { WorldConfig } from './config';
import {
	AddComponentCommand,
	RemoveComponentCommand,
	type Command,
} from '../commands';

export type Registry = Map<symbol, Set<any>>;
export class WorldBuilder {
	#schedules: Map<symbol, System[]> = new Map();
	#registry: Registry = new Map();
	#systems: Set<System> = new Set();

	config: Readonly<WorldConfig>;
	constructor(config: WorldConfig) {
		this.config = config;
		this.registerComponent(Entity)
			.registerCommand(AddComponentCommand)
			.registerCommand(RemoveComponentCommand);
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
			if (!this.#schedules.has(schedule)) {
				this.#schedules.set(schedule, []);
			}
			this.#systems.add(system);
			if (system.parameters) {
				for (const descriptor of system.parameters) {
					descriptor.onAddSystem(this);
				}
			}
			const receivedParameters = system.parameters?.length ?? 0;
			const expectedParameters = system.length;
			DEV_ASSERT(
				// A system should receive at least as many parameters as its
				// length. Fewer is probably the result of bad transformation,
				// more could just be the result of handwritten params.
				receivedParameters >= expectedParameters,
				`System "${system.name}" expects ${expectedParameters} parameters, but will receive ${receivedParameters}. This is likely due to a failed transformation.`,
			);
			this.#schedules.get(schedule)!.push(system);
		}
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
	 * Registers a command type in the world.
	 * @param commandType The Command type (`Class`) to register.
	 * @returns `this`, for chaining.
	 */
	registerCommand(commandType: Command): this {
		return this.register(CommandRegistryKey, commandType);
	}

	/**
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const world = new World(this.config, this.#registry);
		const resourceTypes = this.#registry.get(ResourceRegistryKey) ?? [];
		for (const resourceType of resourceTypes) {
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
