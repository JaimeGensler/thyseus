import type { System } from '../systems';

import type { World } from './World';

/**
 * A class that contains systems to be run, as well as the arguments to provide these systems.
 */
export class Schedule {
	#systems: System[];
	#args: Array<any[]>;

	constructor(systems: System[]) {
		this.#systems = systems;
		this.#args = [];
	}

	/**
	 * Prepares this schedule to be run, grabbing arguments for all systems.
	 * @param world The world to pull arguments from.
	 * @returns `this`, for chaining.
	 */
	prepare(world: World): this {
		for (let i = 0; i < this.#systems.length; i++) {
			this.#args[i] = this.#systems[i].getSystemArguments?.(world) ?? [];
		}
		return this;
	}

	/**
	 * Runs all the systems in this schedule with their arguments.
	 * @returns A promise that resolves once all systems have finished executing.
	 */
	async run(): Promise<void> {
		const systems = this.#systems;
		const args = this.#args;
		for (let i = 0; i < systems.length; i++) {
			await systems[i](...args[i]);
		}
	}
}
export type ScheduleType = typeof Schedule;
