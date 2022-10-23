import { World } from './World';
import { Executor } from './Executor';
import { zipIntoMap } from '../utils/zipIntoMap';
import { WorldCommands } from './WorldCommands';
import { Entities } from './Entities';
import { ThreadGroup } from '../utils/ThreadGroup';
import { createResource, type ResourceType } from '../Resources';
import { Entity, type ComponentType } from '../Components';
import {
	getSystemDependencies,
	getSystemIntersections,
	applyCommands,
	type Dependencies,
	type SystemDefinition,
	type System,
} from '../Systems';
import type { WorldConfig } from './config';
import type { Plugin } from './definePlugin';

export class WorldBuilder {
	systems = [] as SystemDefinition[];
	systemDependencies = [] as (Dependencies | undefined)[];
	#startupSystems = [] as SystemDefinition[];

	components = new Set<ComponentType>();
	resources = new Set<ResourceType>();

	config: WorldConfig;
	url: string | URL | undefined;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		this.config = config;
		this.url = url;
		this.registerComponent(Entity);
		this.addSystem(applyCommands, { afterAll: true });
	}

	/**
	 * Adds a system to the world and processes its parameter descriptors.
	 * @param system The system to add.
	 * @param dependencies The dependencies of this system.
	 * @returns `this`, for chaining.
	 */
	addSystem(system: SystemDefinition, dependencies?: Dependencies): this {
		this.systems.push(system);
		this.systemDependencies.push(dependencies);
		this.#processSystem(system);
		return this;
	}

	/**
	 * Adds a system to the world _**that will only be run once when built**_.
	 * @param system The system to add.
	 * @returns `this`, for chaining.
	 */
	addStartupSystem(system: SystemDefinition): this {
		this.#startupSystems.push(system);
		this.#processSystem(system);
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
	 * Registers a Component in the world. Called automatically for all queried components when a system is added.
	 * @param ComponentType The ComponentType to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(ComponentType: ComponentType<any>): this {
		this.components.add(ComponentType);
		return this;
	}

	/**
	 * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
	 * @param ResourceType The ResourceType to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(ResourceType: ResourceType): this {
		this.resources.add(ResourceType);
		return this;
	}

	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * This method returns a promise for both single- _and_ multi-threaded worlds.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const threads = ThreadGroup.spawn(this.config.threads - 1, this.url);

		const executor = await Executor.fromWorld(this, threads);

		// const resources = zipIntoMap<ResourceType, object>(
		// 	this.resources,
		// 	await threads.sendOrReceive(() =>
		// 		Array.from(this.resources, ResourceType =>
		// 			isSendableClass(ResourceType)
		// 				? createResource(ResourceType, this.#config)
		// 				: null!,
		// 		),
		// 	),
		// );
		// if (ThreadGroup.isMainThread) {
		// 	this.resources.forEach(ResourceType => {
		// 		if (!isSendableClass(ResourceType)) {
		// 			resources.set(
		// 				ResourceType,
		// 				createResource(ResourceType, this.#config),
		// 			);
		// 		}
		// 	});
		// }
		const resources = new Map();

		const entities = await Entities.fromWorld(this, threads);
		const commands = new WorldCommands(entities, this.components);

		threads.setListener('thyseus::getCommandQueue', () => {
			const ret = new Map(commands.queue);
			commands.queue.clear();
			return ret;
		});

		const systems: System[] = [];

		const world = new World(
			this.config,
			resources,
			threads,
			systems,
			executor,
			commands,
			entities,
			[...this.components],
		);

		this.systems.forEach(
			(system, i) => (systems[i] = this.#buildSystem(system, world)),
		);

		if (ThreadGroup.isMainThread) {
			for (const { execute, args } of this.#startupSystems.map(system =>
				this.#buildSystem(system, world),
			)) {
				execute(...args);
			}
		}

		await threads.sendOrReceive(() => 0);
		return world;
	}

	#processSystem(system: SystemDefinition): void {
		system.parameters.forEach(descriptor => descriptor.onAddSystem(this));
	}
	#buildSystem({ fn, parameters }: SystemDefinition, world: World): System {
		return {
			execute: fn,
			args: parameters.map(descriptor => descriptor.intoArgument(world)),
		};
	}
}
