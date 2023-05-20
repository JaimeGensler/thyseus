import { DEV_ASSERT } from '../utils/DEV_ASSERT';
import { World } from './World';
import { defaultPlugin, type Plugin } from './defaultPlugin';
import { ThreadGroup } from '../threads';
import {
	CoreSchedule,
	ParallelExecutor,
	SimpleExecutor,
	type ExecutorType,
	type SystemConfig,
	type SystemList,
} from '../schedule';
import type { System } from '../systems';
import type { Class, Struct } from '../struct';
import type { WorldConfig } from './config';

type SystemListArray = SystemList[];
export class WorldBuilder {
	schedules: Map<symbol, (System | SystemConfig)[]> = new Map();

	components: Set<Struct> = new Set();
	resources: Set<Class> = new Set();
	events: Set<Struct> = new Set();

	#systems: Set<System> = new Set();
	defaultExecutor: ExecutorType;
	executors: Map<symbol, ExecutorType> = new Map();

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
	 * Adds systems to the default schedule of the world (`CoreSchedule.Main`).
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(...systems: SystemListArray): this {
		this.addSystemsToSchedule(CoreSchedule.Main, ...systems);
		return this;
	}

	/**
	 * Adds systems to the specified schedule.
	 * @param schedule The schedule to add the systems to.
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystemsToSchedule(schedule: symbol, ...systems: SystemListArray): this {
		for (const system of systems) {
			if (Array.isArray(system)) {
				for (const s of system) {
					this.#addSystemToSchedule(schedule, s);
				}
			} else {
				this.#addSystemToSchedule(schedule, system);
			}
		}
		return this;
	}

	/**
	 * Adds a system to the specified schedule.
	 * @param schedule The schedule to add the system to.
	 * @param systemLike The system to add.
	 * @returns `this`, for chaining.
	 */
	#addSystemToSchedule(
		schedule: symbol,
		systemLike: System | SystemConfig,
	): this {
		if (!this.schedules.has(schedule)) {
			this.schedules.set(schedule, []);
		}
		const system =
			typeof systemLike === 'function' ? systemLike : systemLike.system;
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
		this.schedules.get(schedule)!.push(system);
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
	 * Registers a component type in the world.
	 * Called automatically for all queried components when a system is added.
	 * @param componentType The componentType (`Struct`) to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(componentType: Struct): this {
		this.components.add(componentType);
		return this;
	}

	/**
	 * Registers a resource type in the world.
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
		this.executors.set(schedule, executor);
		return this;
	}

	/**
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		for (const [scheduleSymbol] of this.schedules) {
			if (!this.executors.has(scheduleSymbol)) {
				this.executors.set(scheduleSymbol, this.defaultExecutor);
			}
		}
		const threads = ThreadGroup.new({
			count: this.config.threads - 1,
			url: this.url,
			isMainThread: this.config.isMainThread,
		});

		const world = await threads.wrapInQueue(async () => {
			const world = new World(
				this.config,
				threads,
				[...this.components],
				[...this.resources],
				[...this.events],
			);
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
			for (const [scheduleSymbol, systems] of this.schedules) {
				world.schedules[scheduleSymbol] = this.executors
					.get(scheduleSymbol)!
					.fromWorld(
						world,
						systems,
						systems.map(s =>
							systemArguments.get(
								typeof s === 'function' ? s : s.system,
							),
						),
					);
			}
			return world;
		});

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
	const { Entity, initStruct } = await import('../storage');
	const { Memory } = await import('../utils/Memory');

	beforeEach(() => Memory.UNSAFE_CLEAR_ALL());

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

	it('calls onAddSystem for all parameters', () => {
		const builder = World.new({ isMainThread: true });
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
		// expect(world.systems[0]).toBe(applyCommands);
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
