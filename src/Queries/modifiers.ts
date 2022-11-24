import type { Struct } from '../struct';

export class Optional<T extends object | Mut<object>> {
	#value: Struct | Mut<any>;
	constructor(value: T | { new (...args: any): T }) {
		this.#value = value as any;
	}
	get value() {
		return this.#value;
	}
}
export class Mut<T extends object> {
	#value: Struct;
	constructor(value: { new (...args: any): T }) {
		this.#value = value;
	}
	get value() {
		return this.#value;
	}
}

export class With<T extends object | object[]> {
	#value: Struct | Struct[];
	constructor(
		value: { new (...args: any): T } | { new (...args: any): T }[],
	) {
		this.#value = value;
	}
	get value() {
		return this.#value;
	}
}
export class Without<T extends object | object[]> {
	#value: Struct;
	constructor(value: { new (...args: any): T }) {
		this.#value = value;
	}
	get value() {
		return this.#value;
	}
}

export type OrContent =
	| With<object>
	| Without<object>
	| Or<OrContent, OrContent>
	| OrContent[];
export class Or<L extends OrContent, R extends OrContent> {
	#l: OrContent;
	#r: OrContent;
	constructor(l: L, r: R) {
		this.#l = l;
		this.#r = r;
	}
	get l() {
		return this.#l;
	}
	get r() {
		return this.#r;
	}
}

export type Filter = With<any> | Without<any> | Or<any, any> | Filter[];
