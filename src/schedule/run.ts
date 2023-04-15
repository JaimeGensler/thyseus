import type { System } from '../systems';
import { DEV_ASSERT } from '../utils/DEV_ASSERT';

class SystemConfig {
	dependents: System[] = [];
	dependencies: System[] = [];
	isFirst: boolean = false;
	isLast: boolean = false;

	system: System;
	constructor(system: System) {
		this.system = system;
	}

	/**
	 * Specifies that this system must run _before_ the provided systems may run.
	 * @param ...systems The systems that this system must run before.
	 * @returns `this`, for chaining.
	 */
	before(...systems: System[]): this {
		this.dependents.push(...systems);
		return this;
	}

	/**
	 * Specifies that this system must run _after_ the provided systems have run.
	 * @param ...systems The systems that this system must run after.
	 * @returns `this`, for chaining.
	 */
	after(...systems: System[]): this {
		this.dependencies.push(...systems);
		return this;
	}

	/**
	 * Specifies that this system should try to run before any other systems in the schedule have run.
	 * Systems ordered to run before this will still run before.
	 * @returns `this`, for chaining.
	 */
	first(): this {
		DEV_ASSERT(
			!this.isLast,
			'A system cannot be ordered to run both first and last!',
		);
		this.isFirst = true;
		return this;
	}

	/**
	 * Specifies that this system should try to run after all other systems in the schedule have run.
	 * @returns `this`, for chaining.
	 */
	last(): this {
		DEV_ASSERT(
			!this.isFirst,
			'A system cannot be ordered to run both first and last!',
		);
		this.isLast = true;
		return this;
	}
}
export { SystemConfig };

type Run = {
	(system: System): SystemConfig;
	chain(...systems: System[]): (System | SystemConfig)[];
};

const run: Run = system => new SystemConfig(system);
run.chain = (...systems) =>
	systems.map((system, i) =>
		i === 0 ? system : new SystemConfig(system).after(systems[i - 1]),
	);

export { run };
