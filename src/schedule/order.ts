import { SystemDefinition } from '../systems';

class SystemOrder {
	before(...systems: SystemDefinition[]): this {
		return this;
	}
	after(...systems: SystemDefinition[]): this {
		return this;
	}
}

function order(...systems: SystemDefinition[]): SystemOrder {
	return new SystemOrder();
}

function chain(...systems: SystemDefinition[]) {}
order.chain = chain;

export { order };
