import { System } from '../systems';

export class Schedule {
	#systems: System[];
	#args: Array<any[]>;

	constructor(systems: System[], args: Array<any[]>) {
		this.#systems = systems;
		this.#args = args;
	}

	async run(): Promise<void> {
		const systems = this.#systems;
		const args = this.#args;
		for (let i = 0; i < systems.length; i++) {
			await systems[i](...args[i]);
		}
	}
}
export type ScheduleType = typeof Schedule;
