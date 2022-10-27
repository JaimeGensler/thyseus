import { World } from './World';
import { defaultPlugin } from './defaultPlugin';
import { ThreadGroup, type SendableType } from '../utils/ThreadGroup';
import type { ComponentType } from '../Components';
import type { Dependencies, SystemDefinition } from '../Systems';
import type { ResourceType } from '../Resources';
import type { WorldConfig } from './config';
import type { Plugin } from './definePlugin';

export class WorldBuilder {
	systems = [] as SystemDefinition[];
	systemDependencies = [] as (Dependencies | undefined)[];
	#startupSystems = [] as SystemDefinition[];

	components = new Set<ComponentType>();
	resources = new Set<ResourceType>();
	threadChannels = {} as Record<string, (world: World) => (data: any) => any>;

	config: WorldConfig;
	url: string | URL | undefined;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		this.config = config;
		this.url = url;
		defaultPlugin(this);
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
	registerComponent(ComponentType: ComponentType): this {
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
	 * Registers a channel for threads. When a thread receives a message, it will run the callback created by `listenerCreator`.
	 * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
	 * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
	 * @returns `this`, for chaining.
	 */
	registerThreadChannel<
		I extends SendableType = void,
		O extends SendableType = void,
	>(
		channel: string,
		listenerCreator: (world: World) => (data: I) => O,
	): this {
		this.threadChannels[channel] = listenerCreator;
		return this;
	}

	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const threads = ThreadGroup.spawn(this.config.threads - 1, this.url);

		const world = await threads.wrapInQueue(
			() =>
				new World(
					this.config,
					threads,
					this.components,
					this.resources,
					this.systems,
					this.systemDependencies,
					this.threadChannels,
				),
		);

		if (threads.isMainThread) {
			await Promise.all(
				Array.from(world.resources.values(), resource =>
					//@ts-ignore
					resource.initialize?.(world),
				),
			);
		}

		if (threads.isMainThread) {
			for (const { fn, parameters } of this.#startupSystems) {
				fn(...parameters.map(d => d.intoArgument(world)));
			}
		}
		await threads.sendOrReceive(() => 0);

		return world;
	}

	#processSystem(system: SystemDefinition): void {
		system.parameters.forEach(descriptor => descriptor.onAddSystem(this));
	}
}
