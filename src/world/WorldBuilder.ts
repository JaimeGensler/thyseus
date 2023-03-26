import { World } from './World';
import { applyCommands } from '../commands';
import { defaultPlugin, type Plugin } from './defaultPlugin';
import { ThreadGroup, type ThreadMessageChannel } from '../threads';
import {
	ParallelExecutor,
	SimpleExecutor,
	type ExecutorType,
} from '../schedule/executors';
import { CoreSchedule } from '../schedule';
import { SystemDependencies, type SystemDefinition } from '../systems';
import type { Class, Struct } from '../struct';
import type { WorldConfig } from './config';

export class WorldBuilder {
	systems: Record<symbol, SystemDefinition[]> = {};

	components: Set<Struct> = new Set();
	resources: Set<Class> = new Set();
	events: Set<Struct> = new Set();
	threadChannels: ThreadMessageChannel[] = [];

	defaultExecutor: ExecutorType;
	executors: Record<symbol, ExecutorType> = {};

	config: Readonly<WorldConfig>;
	url: Readonly<string | URL | undefined>;
	constructor(config: WorldConfig, url: string | URL | undefined) {
		this.config = config;
		this.url = url;
		this.defaultExecutor =
			config.threads > 1 ? ParallelExecutor : SimpleExecutor;
		defaultPlugin(this);
	}

	/**
	 * Adds systems to the default schedule of the world.
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(...systems: SystemDefinition[]): this {
		this.addSystemsToSchedule(CoreSchedule.Main, ...systems);
		return this;
	}

	/**
	 * Adds systems to the specified schedule.
	 * @param schedule The schedule to add the systems to.
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystemsToSchedule(
		schedule: symbol,
		...systems: SystemDefinition[]
	): this {
		if (!(schedule in systems)) {
			this.systems[schedule] = [] as SystemDefinition[];
		}
		this.systems[schedule].push(...systems);
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
	 * Registers a Component in the world.
	 * Called automatically for all queried components when a system is added.
	 * @param componentType The componentType (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(componentType: Struct): this {
		this.components.add(componentType);
		return this;
	}

	/**
	 * Registers a Resource in the world.
	 * Called automatically for all accessed resources when a system is added.
	 * @param resourceType The Resource type (`Class`) to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(resourceType: Class): this {
		this.resources.add(resourceType);
		return this;
	}

	/**
	 * Registers an event type in the world.
	 * Called automatically for all event readers/writers when a system is added.
	 * @param resourceType The Event type (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerEvent(eventType: Struct): this {
		this.events.add(eventType);
		return this;
	}

	/**
	 * Registers a message channel for threads.
	 * When a thread receives a message, it will run the callback created by `listenerCreator`.
	 * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
	 * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
	 * @returns `this`, for chaining.
	 */
	registerThreadChannel(channel: ThreadMessageChannel<any, any>): this {
		this.threadChannels.push(channel);
		return this;
	}

	/**
	 * Sets the executor that schedules will use by default.
	 * Individual schedules can specify their own executor; if they do not, this executor will be used.
	 * @param executor The executor type to use by default.
	 * @returns `this`, for chaining.
	 */
	setDefaultExecutor(executor: ExecutorType): this {
		this.defaultExecutor = executor;
		return this;
	}

	/**
	 * Sets the executor to use for a specific schedule.
	 * @param schedule The schedule.
	 * @param executor The executor type for this schedule.
	 * @returns `this`, for chaining.
	 */
	setExecutorForSchedule(schedule: symbol, executor: ExecutorType): this {
		this.executors[schedule] = executor;
		return this;
	}

	/**
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		for (const key of Object.getOwnPropertySymbols(this.systems)) {
			if (!(key in this.executors)) {
				this.executors[key] = this.defaultExecutor;
			}
		}
		const threads = ThreadGroup.new({
			count: this.config.threads - 1,
			url: this.url,
			isMainThread: this.config.isMainThread,
		});

		const world = await threads.wrapInQueue(
			() =>
				new World(
					this.config,
					threads,
					[...this.components],
					[...this.resources],
					[...this.events],
					this.threadChannels,
					this.systems,
					this.executors,
				),
		);

		if (threads.isMainThread) {
			await Promise.all(
				//@ts-ignore
				world.resources.map(resource => resource.initialize?.(world)),
			);
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
		world.addSystems(system);
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
