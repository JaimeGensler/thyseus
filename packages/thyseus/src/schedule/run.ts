import type { System } from '../systems';

export class SystemConfig {
	dependents: System[] = [];
	dependencies: System[] = [];

	system: System;
	constructor(system: System) {
		this.system = system;
	}

	/**
	 * Specifies that this system must run _before_ the provided systems may run.
	 * @param ...systems The systems that this system must run before.
	 * @returns `this`, for chaining.
	 */
	before(...systems: (System | System[])[]): this {
		this.dependents.push(...systems.flat());
		return this;
	}

	/**
	 * Specifies that this system must run _after_ the provided systems have run.
	 * @param ...systems The systems that this system must run after.
	 * @returns `this`, for chaining.
	 */
	after(...systems: (System | System[])[]): this {
		this.dependencies.push(...systems.flat());
		return this;
	}
}

type SystemList = System | System[] | SystemConfig | SystemConfig[];

type Run = {
	(system: System): SystemConfig;
	chain(...systems: (System | System[])[]): SystemList[];
};

const run: Run = system => new SystemConfig(system);

run.chain = (...systems) =>
	systems.map((system, i) => {
		if (i === 0) {
			return system;
		} else if (Array.isArray(system)) {
			return system.map(s => new SystemConfig(s).after(systems[i - 1]));
		} else {
			return new SystemConfig(system).after(systems[i - 1]);
		}
	});

export { run };
export type { SystemList };

// TODO: Tests
