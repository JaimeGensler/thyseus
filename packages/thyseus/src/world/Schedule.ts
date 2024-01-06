import { DEV_ASSERT } from '../utils';
import type { System } from '../systems';

import type { World } from './World';

/**
 * A class that contains systems to be run, as well as the arguments to provide these systems.
 *
 * By default, systems are added to this class, the parent `Schedule`.
 *
 * Can be extended to create custom schedules.
 */
export class Schedule {
	#world: World;
	#systems: System[];
	#args: Array<any[]>;

	constructor(world: World) {
		this.#world = world;
		this.#systems = [];
		this.#args = [];
	}

	/**
	 * Adds systems to this schedule.
	 * @param system The system to add.
	 * @returns `this`, for chaining.
	 */
	addSystems(systems: System | System[]): this {
		for (const system of Array.isArray(systems) ? systems : [systems]) {
			DEV_ASSERT(
				!this.#systems.includes(system),
				`Cannot add the same system to a schedule twice (adding ${system.name} to ${this.constructor.name})`,
			);
			this.#systems.push(system);
		}
		return this;
	}

	/**
	 * Removes a system from this schedule.
	 * @param system The system to remove.
	 * @returns `this`, for chaining.
	 */
	removeSystem(system: System): this {
		DEV_ASSERT(
			this.#systems.includes(system),
			`Cannot remove a system from a schedule it isn't in (removing ${system.name} from ${this.constructor.name})`,
		);
		this.#systems.splice(this.#systems.indexOf(system), 1);
		return this;
	}

	/**
	 * Returns whether the schedule has the specified system.
	 * @param system The system to check the presence of.
	 * @returns `true` if the schedule has the system, `false` otherwise.
	 */
	hasSystem(system: System): boolean {
		return this.#systems.includes(system);
	}

	/**
	 * Prepares the system arguments for this schedule, grabbing new arguments for all systems.
	 * Any previous arguments will be replaced.
	 * @returns A promise that resolves once all systems are ready to be run.
	 */
	async prepare(): Promise<void> {
		for (let i = 0; i < this.#systems.length; i++) {
			this.#args[i] = await Promise.all(
				this.#systems[i].getSystemArguments?.(this.#world) ?? [],
			);
		}
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
