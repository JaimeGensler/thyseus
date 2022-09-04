import World from './World';
import Executor from './Executor';
import getDefaultSendableClasses from './getDefaultSendableClasses';
import applyCommands from '../Systems/applyCommands';
import Thread, { type SendableClass } from '../utils/Thread';
import {
	getSystemDependencies,
	getSystemIntersections,
	type Dependencies,
	type SystemDefinition,
} from '../Systems';
import type { WorldConfig } from './config';
import type { System } from '../utilTypes';
import { ComponentType, createStore } from '../Components';
import type { ResourceType } from '../Resources/Resource';
import type { Plugin } from './definePlugin';
import createResource from '../Resources/createResource';
import zipIntoMap from '../utils/zipIntoMap';
import WorldCommands from './WorldCommands';

export default class WorldBuilder {
	#systems = [] as SystemDefinition[];
	#systemDependencies = [] as (Dependencies | undefined)[];
	#startupSystems = [] as SystemDefinition[];

	#sendableClasses = getDefaultSendableClasses();

	#resources = new Set<ResourceType>();
	#queries = new Map<unknown, unknown>();
	#components = new Set<ComponentType>();

	#config: WorldConfig;
	#url: string | URL | undefined;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		this.#config = config;
		this.#url = url;
		this.addSystem(applyCommands, { afterAll: true });
	}

	get resources() {
		return this.#resources;
	}
	get queries() {
		return this.#queries;
	}
	get components() {
		return this.#components;
	}
	get config() {
		return this.#config;
	}
	get url() {
		return this.#url;
	}

	/**
	 * Adds a system to the world and processes its parameter descriptors.
	 * @param system The system to add.
	 * @param dependencies The dependencies of this system.
	 * @returns `this`, for chaining.
	 */
	addSystem(system: SystemDefinition, dependencies?: Dependencies): this {
		this.#systems.push(system);
		this.#systemDependencies.push(dependencies);
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
	 * @returns `this`, for chaining.
	 */
	addPlugin(plugin: Plugin): this {
		plugin(this);
		return this;
	}

	/**
	 * Registers a Component in the world. Called automatically for all queried components when a system is added.
	 * @param Component The ComponentType to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(ComponentType: ComponentType<any>): this {
		this.#components.add(ComponentType);
		return this;
	}

	/**
	 * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
	 * @param Component The ResourceType to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(ResourceType: ResourceType): this {
		this.#resources.add(ResourceType);
		return this;
	}

	/**
	 * Registers a Resource in the world. Called automatically for all used sendable classes when a system is added.
	 * @param Component The SendableClass to register.
	 * @returns `this`, for chaining.
	 */
	registerSendableClass(SendableClass: SendableClass<any>): this {
		if (Thread.isSendableClass(SendableClass)) {
			this.#sendableClasses.push(SendableClass);
		}
		return this;
	}

	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * This method returns a promise for both single- _and_ multi-threaded worlds.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const threads = Thread.spawnBulk(
			this.#config.threads - 1,
			this.#url,
			this.#sendableClasses,
		);

		const executor = await Thread.createOrReceive(
			Thread.Context.Main,
			threads,
			() => {
				const intersections = getSystemIntersections(this.#systems);
				const dependencies = getSystemDependencies(
					this.#systems,
					this.#systemDependencies,
					intersections,
				);
				const local = this.#systems.reduce((acc, val, i) => {
					if (val.parameters.some(param => param.isLocalToThread())) {
						acc.add(i);
					}
					return acc;
				}, new Set<number>());
				return Executor.from(intersections, dependencies, local);
			},
		);

		const components = zipIntoMap(
			this.#components,
			await Thread.createOrReceive(Thread.Context.Main, threads, () =>
				Array.from(this.#components, ComponentType =>
					createStore(ComponentType, this.#config),
				),
			),
		);
		const resources = zipIntoMap(
			this.#resources,
			await Thread.createOrReceive(Thread.Context.Main, threads, () =>
				Array.from(this.#resources, ResourceType =>
					Thread.isSendableClass(ResourceType)
						? createResource(ResourceType)
						: null,
				),
			),
		);

		// TODO: Wait for confirmation that all threads are built

		const systems = this.#systems.map(system => this.#buildSystem(system));
		const starters = this.#startupSystems.map(system =>
			this.#buildSystem(system),
		);

		Thread.execute(Thread.Context.Main, () => {
			for (const { execute, args } of starters) {
				execute(...args);
			}
		});

		return new World(
			components,
			resources as any,
			new Map(),
			threads,
			systems,
			executor,
			{} as any,
		);
	}

	#processSystem(system: SystemDefinition): void {
		system.parameters.forEach(descriptor => descriptor.onAddSystem(this));
	}
	#buildSystem({ fn, parameters }: SystemDefinition): System {
		// TODO
		return {} as any;
	}
}
