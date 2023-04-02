import type { System } from '../systems';

class SystemOrder {
	constructor() {}

	/**
	 * Specifies that this system must run _before_ the provided systems may run.
	 * @param ...systems The systems to run before this system
	 * @returns `this`, for chaining.
	 */
	before(...systems: System[]): this {
		return this;
	}

	/**
	 * Specifies that this system must run _after_ the provided systems have run.
	 * @param ...systems The systems to run before this system
	 * @returns `this`, for chaining.
	 */
	after(...systems: System[]): this {
		return this;
	}

	/**
	 * Specifies that this system should try to run before any other systems in the schedule have run.
	 * Systems ordered to run before this will still run before.
	 * @returns `this`, for chaining.
	 */
	first(): this {
		return this;
	}

	/**
	 * Specifies that this system should try to run after all other systems in the schedule have run.
	 * @returns `this`, for chaining.
	 */
	last(): this {
		return this;
	}
}

function order(...systems: System[]): SystemOrder {
	return new SystemOrder();
}

function chain(...systems: System[]) {}
order.chain = chain;

export { order };
