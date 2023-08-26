import type { Struct } from '../struct';

export class Mut<T extends object> {
	#value: Struct;
	constructor(value: { new (...args: any): T }) {
		this.#value = value;
	}
	get value() {
		return this.#value;
	}
}
