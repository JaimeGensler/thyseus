import { World } from './World';
import { applyCommands } from '../commands';
import { defaultPlugin, type Plugin } from './defaultPlugin';
import { ThreadGroup, type ThreadMessageChannel } from '../threads';
import {
	ParallelExecutor,
	SimpleExecutor,
	type ExecutorType,
} from '../executors';
import { SystemDependencies, type SystemDefinition } from '../systems';
import type { Class, Struct } from '../struct';
import type { WorldConfig } from './config';

export class WorldBuilder {
	systems: SystemDefinition[] = [];
	#systemDependencies: SystemDependencies[] = [];
	#startupSystems: SystemDefinition[] = [];

	components: Set<Struct> = new Set();
	resources: Set<Class> = new Set();
	events: Set<Struct> = new Set();
	threadChannels: ThreadMessageChannel[] = [];
	executor: ExecutorType;

	config: Readonly<WorldConfig>;
	url: Readonly<string | URL | undefined>;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		this.config = config;
		this.url = url;
		this.executor = config.threads > 1 ? ParallelExecutor : SimpleExecutor;
		defaultPlugin(this);
	}

	/**
	 * Adds a system to the world and processes its parameter descriptors.
	 * @param system The system to add.
	 * @param dependencies The dependencies of this system.
	 * @returns `this`, for chaining.
	 */
	addSystem(system: SystemDefinition): this {
		this.systems.push(system);
		this.#systemDependencies.push(system.getAndClearDependencies());
		system.parameters.forEach(descriptor => descriptor.onAddSystem(this));
		return this;
	}

	/**
	 * Adds a system to the world _**that will only be run once when built**_.
	 * @param system The system to add.
	 * @returns `this`, for chaining.
	 */
	addStartupSystem(system: SystemDefinition): this {
		this.#startupSystems.push(system);
		system.parameters.forEach(descriptor => descriptor.onAddSystem(this));
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
	 * @param componentType The componentType (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(componentType: Struct): this {
		this.components.add(componentType);
		return this;
	}

	/**
	 * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
	 * @param resourceType The Resource type (`Class`) to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(resourceType: Class): this {
		this.resources.add(resourceType);
		return this;
	}

	/**
	 * Registers an event type in the world. Called automatically for all event readers/writers when a system is added.
	 * @param resourceType The Event type (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerEvent(eventType: Struct): this {
		this.events.add(eventType);
		return this;
	}

	/**
	 * Registers a message channel for threads. When a thread receives a message, it will run the callback created by `listenerCreator`.
	 * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
	 * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
	 * @returns `this`, for chaining.
	 */
	registerThreadChannel(channel: ThreadMessageChannel<any, any>): this {
		this.threadChannels.push(channel);
		return this;
	}

	/**
	 * Sets the Executor that this world will use.
	 * @param executor The Executor to use.
	 * @returns `this`, for chaining.
	 */
	setExecutor(executor: ExecutorType): this {
		this.executor = executor;
		return this;
	}

	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const threads = ThreadGroup.spawn(
			this.config.threads - 1,
			this.url,
			this.config.isMainThread,
		);

		const world = await threads.wrapInQueue(
			() =>
				new World(
					this.config,
					threads,
					this.executor,
					[...this.components],
					[...this.resources],
					[...this.events],
					this.systems,
					this.#systemDependencies,
					this.threadChannels,
				),
		);
		await threads.wrapInQueue(async () => {
			for (const system of this.systems) {
				world.systems.push(system.fn);
				world.arguments.push(
					await Promise.all(
						system.parameters.map(p => p.intoArgument(world)),
					),
				);
			}
		});

		if (threads.isMainThread) {
			await Promise.all(
				//@ts-ignore
				world.resources.map(resource => resource.initialize?.(world)),
			);

			for (const system of this.#startupSystems) {
				await system.fn(
					...system.parameters.map(p => p.intoArgument(world)),
				);
			}
			await applyCommands.fn(world, new Map());
		}

		return world;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;
	const { defineSystem } = await import('../systems');
	const { Entity, initStruct } = await import('../storage');
	const { memory } = await import('../utils/memory');

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	class MockChannel {
		static channel: MockChannel;
		listeners = new Set<Function>();
		constructor() {
			if (!MockChannel.channel) {
				MockChannel.channel = this;
			}
			return MockChannel.channel;
		}
		addEventListener(_: any, l: any) {
			this.listeners.add(l);
		}
		removeEventListener(_: any, l: any) {
			this.listeners.delete(l);
		}
		postMessage(data: any) {
			setTimeout(
				() =>
					this.listeners.forEach(l =>
						l({ currentTarget: this, data }),
					),
				10,
			);
		}
	}
	vi.stubGlobal('BroadcastChannel', MockChannel);
	vi.stubGlobal(
		'Worker',
		class MockWorker {
			target?: MockWorker;

			handler: any;
			addEventListener(_: 'message', handler: any): this {
				this.handler = handler;
				return this;
			}
			removeEventListener(): void {}
			postMessage(data: any) {
				setTimeout(() => {
					this.target!.handler({ currentTarget: this.target, data });
				}, 10);
			}
		},
	);
	vi.stubGlobal('navigator', {
		locks: {
			async request(_: any, cb: () => void) {
				await Promise.resolve();
				cb();
			},
		},
	});

	const initializeTimeSpy = vi.fn();
	class Time {
		static size = 8;
		initialize = initializeTimeSpy;
	}

	it('initializes resources', async () => {
		const builder = World.new({ isMainThread: true }).registerResource(
			Time,
		);
		expect(initializeTimeSpy).not.toHaveBeenCalled();
		const world = await builder.build();
		expect(initializeTimeSpy).toHaveBeenCalledWith(world);
	});

	it('runs startup systems only once', async () => {
		const systemSpy = vi.fn();

		const builder = World.new({ isMainThread: true }).addStartupSystem(
			defineSystem(() => [], systemSpy),
		);
		expect(systemSpy).not.toHaveBeenCalled();
		const world = await builder.build();
		expect(systemSpy).toHaveBeenCalledWith();
		expect(systemSpy).toHaveBeenCalledOnce();
		await world.update();
		expect(systemSpy).toHaveBeenCalledOnce();
	});

	it('adds defaultPlugin', async () => {
		const world = await World.new({ isMainThread: true }).build();
		expect(world.components).toStrictEqual([Entity]);
		expect(world.systems[0]).toBe(applyCommands.fn);
	});

	it('clears dependencies after adding systems', () => {
		const system = defineSystem(
			() => [],
			() => {},
		);
		const world = World.new({ isMainThread: true });
		system.beforeAll();
		world.addSystem(system);
		expect(system.getAndClearDependencies()).toStrictEqual({
			dependencies: [],
			implicitPosition: 0,
		});
	});

	it('constructs struct resources correctly', async () => {
		class StructClass {
			static size = 1;
			static alignment = 1;
			constructor() {
				initStruct(this);
			}
		}
		const world = await World.new({ isMainThread: true })
			.registerResource(StructClass)
			.build();
		expect(world.resources[0]).toBeInstanceOf(StructClass);
		expect((world.resources[0] as any).__$$b).not.toBe(0);
	});
}
