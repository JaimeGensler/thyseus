import WorldBuilder from './WorldBuilder';
import SingleWorldBuilder from './SingleWorldBuilder';
import ThreadWorldBuilder from './ThreadWorldBuilder';
import {
	DEFAULT_WORLD_CONFIG,
	type WorldConfig,
	type SingleThreadedWorldConfig,
} from './config';
import type Thread from '../utils/Thread';
import type EntityManager from '../utils/EntityManager';
import type { System } from '../utilTypes';
import type { Executor } from './Executor';

const IS_MAIN_THREAD = !!globalThis.document;

export default class World {
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	static new(
		config: Partial<WorldConfig> = {},
		url?: string | URL,
	): WorldBuilder {
		const Builder =
			config.threads && config.threads > 1
				? IS_MAIN_THREAD
					? WorldBuilder
					: ThreadWorldBuilder
				: SingleWorldBuilder;
		return new Builder({ ...DEFAULT_WORLD_CONFIG, ...config }, url) as any;
	}
	#mutLocalSystems: Set<number> = new Set();

	#systems: System[];
	#entityManager: EntityManager;
	#threads: Thread[];
	#executor: Executor;
	#localSystems: Set<number>;
	constructor(
		systems: System[],
		entityManager: EntityManager,
		threads: Thread[],
		executor: Executor,
		localSystems: Set<number>,
	) {
		this.#systems = systems;
		this.#entityManager = entityManager;
		this.#threads = threads;
		this.#executor = executor;
		this.#localSystems = localSystems;

		if (IS_MAIN_THREAD) {
			//@ts-ignore
			this.#entityManager.updateQueries();
		}
		this.#executor.onReady(() => this.#runSystems());
	}

	async update() {
		this.#executor.reset();
		for (let i = 0; i < this.#systems.length; i++) {
			if (this.#localSystems.has(i)) {
				this.#mutLocalSystems.add(i);
			} else {
				this.#executor.add(i);
			}
		}
		this.#executor.start();
	}

	async #runSystems() {
		for await (const sid of this.#executor.iter(this.#mutLocalSystems)) {
			const system = this.#systems[sid];
			system.execute(...system.args);
		}
		this.#executor.onReady(() => this.#runSystems());
	}
}
