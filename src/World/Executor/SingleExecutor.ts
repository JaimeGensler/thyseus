import Executor from './type';

const noop = () => {};
export default class SingleExecutor implements Executor {
	#wait: (value: unknown) => void = noop;

	#systemsToExecute: number[];
	constructor(systemsToExecute: number[]) {
		this.#systemsToExecute = systemsToExecute;
		this.#wait;
	}

	add() {}
	start() {
		this.#wait(0);
	}

	async whenReady(fn: () => void) {
		await new Promise(resolve => {
			this.#wait = resolve;
		});
		fn();
	}

	async *iter() {
		for (const sid of this.#systemsToExecute) {
			yield sid;
		}
	}
}
