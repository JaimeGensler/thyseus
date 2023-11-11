import { DEV_ASSERT } from '../utils';
import type { System } from '../systems';

import { Schedule, type ScheduleType } from './Schedule';
import { World } from './World';
import type { WorldConfig } from './config';
import type { Plugin } from './Plugin';
import type { WorldEventListeners } from './WorldEventListeners';

export class WorldBuilder {
	#schedules: Map<ScheduleType, System[]>;
	#systems: Set<System>;
	#creators: Array<(world: World) => object | Promise<object>>;
	#listeners: WorldEventListeners;

	config: Readonly<WorldConfig>;
	constructor(config: WorldConfig) {
		this.#schedules = new Map();
		this.#systems = new Set();
		this.#creators = [];
		this.#listeners = {
			start: [],
			stop: [],
			createTable: [],
		};
		this.config = config;
	}

	/**
	 * Adds systems to the default schedule of the world (`CoreSchedule.Main`).
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(...systems: System[]): this {
		this.addSystemsToSchedule(Schedule, ...systems);
		return this;
	}

	/**
	 * Adds systems to the specified schedule.
	 * @param schedule The schedule to add the systems to.
	 * @param systems The systems to add.
	 * @returns `this`, for chaining.
	 */
	addSystemsToSchedule(schedule: ScheduleType, ...systems: System[]): this {
		for (const system of systems.flat()) {
			if (!this.#schedules.has(schedule)) {
				this.#schedules.set(schedule, []);
			}
			this.#systems.add(system);
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
	 * Accepts a function that handles creation of a resource type.
	 * Takes precedence over the resource's `fromWorld` static property, if present.
	 *
	 * If multiple creators for the same resource exist, all creator functions will be called but only the **last** result will be used.
	 *
	 * @param creator A function that accepts the world and returns the resource, or a promise resolving to the resource.
	 * @returns `this`, for chaining.
	 */
	createResource(creator: (world: World) => object | Promise<object>): this {
		this.#creators.push(creator);
		return this;
	}

	/**
	 * Adds an event listener to the world.
	 * Listeners are attached immediately after the world is constructed.
	 */
	addEventListener<T extends keyof WorldEventListeners>(
		type: T,
		listener: WorldEventListeners[T][0],
	): void {
		DEV_ASSERT(
			type in this.#listeners,
			`Unrecognized World event listener ("${type}")`,
		);
		this.#listeners[type].push(listener as any);
	}

	/**
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const world = new World(this.config, this.#listeners);

		const systemArguments = new Map();
		for (const system of this.#systems) {
			systemArguments.set(
				system,
				await Promise.all(system.getSystemArguments?.(world) ?? []),
			);
		}
		for (const creator of this.#creators) {
			const resource = await creator(world);
			const index =
				world.resources.findIndex(
					res => res.constructor === resource.constructor,
				) ?? world.resources.length;
			world.resources[index] = resource;
		}
		for (const [scheduleType, systems] of this.#schedules) {
			world.schedules.set(
				scheduleType,
				new scheduleType(
					systems,
					systems.map(s => systemArguments.get(s)),
				),
			);
		}

		return world;
	}
}
