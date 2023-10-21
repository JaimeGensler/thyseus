import { DEV_ASSERT } from '../utils';
import type { System } from '../systems';

import { DefaultSchedule } from './schedules';
import { World } from './World';
import type { WorldConfig } from './config';
import type { Plugin } from './Plugin';

export class WorldBuilder {
	#schedules: Map<symbol, System[]>;
	#systems: Set<System>;

	config: Readonly<WorldConfig>;
	constructor(config: WorldConfig) {
		this.#schedules = new Map();
		this.#systems = new Set();
		this.config = config;
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
	 * Builds the world.
	 * @returns `Promise<World>`
	 */
	async build(): Promise<World> {
		const world = new World(this.config);
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
