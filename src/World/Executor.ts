import { BigUintArray } from '../utils/BigUintArray';
import { vecUtils } from '../utils/vecUtils';
import {
	getSystemDependencies,
	getSystemIntersections,
	type Dependencies,
	type SystemDefinition,
} from '../Systems';
import type { World } from './World';

let nextId = 0;
export class Executor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: (Dependencies | undefined)[],
	) {
		const intersections = world.threads.queue(() =>
			getSystemIntersections(systems),
		);
		const dependencyMasks = world.threads.queue(() =>
			getSystemDependencies(systems, systemDependencies, intersections),
		);
		const local = world.threads.isMainThread
			? systems.reduce(
					(acc, val, i) =>
						val.parameters.some((param: any) =>
							param.isLocalToThread(),
						)
							? acc.add(i)
							: acc,
					new Set<number>(),
			  )
			: new Set<number>();

		const systemVec = world.threads.queue(
			// Storing current length
			() => new Uint16Array(world.createBuffer(systems.length + 2)),
		);
		const status = new BigUintArray(
			systems.length,
			2,
			world.threads.queue(
				() =>
					new Uint8Array(
						BigUintArray.getBufferLength(systems.length, 2),
					),
			),
		);
		const id = world.threads.queue(() => String(nextId++));

		return new this(
			intersections,
			dependencyMasks,
			systemVec,
			status,
			local,
			id,
		);
	}

	#signal: BroadcastChannel;

	#intersections: bigint[];
	#dependencies: bigint[];
	#systemsToExecute: Uint16Array;
	#status: BigUintArray; // [ SystemsRunning, SystemsCompleted ]
	#local: Set<number>;
	#id: string;
	constructor(
		intersections: bigint[],
		dependencies: bigint[],
		systemsToExecute: Uint16Array,
		status: BigUintArray,
		local: Set<number>,
		id: string,
	) {
		this.#intersections = intersections;
		this.#dependencies = dependencies;
		this.#systemsToExecute = systemsToExecute;
		this.#status = status;
		this.#signal = new BroadcastChannel('thyseus::executor');
		this.#local = local;
		this.#id = id;
	}

	add(system: number) {
		vecUtils.push(this.#systemsToExecute, system);
	}
	start() {
		this.#signal.postMessage(0);
	}
	reset() {
		this.#status.set(0, 0n);
		this.#status.set(1, 0n);
		for (let i = 0; i < this.#dependencies.length; i++) {
			if (!this.#local.has(i)) {
				vecUtils.push(this.#systemsToExecute, i);
			}
		}
	}

	async #sendSignal() {
		this.#signal.postMessage(0);
	}
	async #receiveSignal() {
		return new Promise(r => this.#signal.addEventListener('message', r));
	}

	async onReady(fn: () => void) {
		await this.#receiveSignal();
		fn();
	}

	async *[Symbol.asyncIterator]() {
		const local = new Set(this.#local);
		while (vecUtils.size(this.#systemsToExecute) + local.size > 0) {
			const size = vecUtils.size(this.#systemsToExecute);
			let runningSystem = -1;

			await navigator.locks.request(this.#id, () => {
				const active = this.#status.get(0);
				const deps = this.#status.get(1);
				for (const systemId of [
					...local,
					...vecUtils.iter(this.#systemsToExecute),
				]) {
					if (
						(active & this.#intersections[systemId]) === 0n &&
						(deps & this.#dependencies[systemId]) ===
							this.#dependencies[systemId]
					) {
						runningSystem = systemId;
						vecUtils.delete(
							this.#systemsToExecute,
							this.#systemsToExecute.indexOf(systemId),
						);
						local.delete(systemId);
						this.#status.OR(0, 1n << BigInt(systemId));
						break;
					}
				}
			});

			if (runningSystem > -1) {
				yield runningSystem;

				await navigator.locks.request(this.#id, () => {
					this.#status.XOR(0, 1n << BigInt(runningSystem));
					this.#status.OR(1, 1n << BigInt(runningSystem));
					if (
						vecUtils.size(this.#systemsToExecute) !== 0 ||
						(vecUtils.size(this.#systemsToExecute) === 0 &&
							this.#status.get(0) === 0n)
					) {
						this.#sendSignal();
					}
				});
			} else if (size !== 0) {
				await this.#receiveSignal();
			}
		}
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	let channel: any;
	vi.stubGlobal(
		'BroadcastChannel',
		class {
			handler: any;
			constructor() {
				if (!channel) {
					channel = this;
				}
				return channel;
			}

			addEventListener(_: 'message', handler: any) {
				this.handler = handler;
			}
			removeEventListener(): void {}
			postMessage() {
				setTimeout(() => this.handler(), 10);
			}
		},
	);
	vi.stubGlobal('navigator', {
		locks: {
			async request(_: any, cb: () => void) {
				cb();
			},
		},
	});

	const createExecutor = (i: bigint[], d: bigint[], l: Set<number>) =>
		new Executor(
			i,
			d,
			new Uint16Array(i.length + 1),
			new BigUintArray(
				i.length,
				2,
				new Uint8Array(BigUintArray.getBufferLength(i.length, 2)),
			),
			l,
			'',
		);

	it('calls whenReady callback when started', async () => {
		const exec = createExecutor(
			[0b110n, 0b000n, 0b000n],
			[0b000n, 0b000n, 0b000n],
			new Set(),
		);
		const spy = vi.fn();
		const promise = exec.onReady(spy);
		expect(spy).not.toHaveBeenCalled();
		exec.start();
		await promise;
		expect(spy).toHaveBeenCalled();
	});

	it('iterates all elements with no intersections, no dependencies)', async () => {
		const exec = createExecutor(emptyMask, emptyMask, new Set());
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const visited: number[] = [];
		for await (const id of exec) {
			expect(visited).not.toContain(id);
			visited.push(id);
		}
		for (let i = 0; i < 4; i++) {
			expect(visited).toContain(i);
		}
	});

	it.only('iterates elements with intersections', async () => {
		const exec = createExecutor(
			[0b1000n, 0b0000n, 0b0000n, 0b0001n],
			emptyMask,
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		let res1 = await iter1.next();
		let res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);
		res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);

		// iter2.next() is called first but is waiting on intersections to resolve.
		// iter1.next() resolves the intersection and is able grab the final system.
		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
		]);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
	});

	it('iterates elements with dependencies', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		let res1 = await iter1.next();
		let res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);
		res2 = await iter2.next();
		expect(res1.value).not.toBe(res2.value);

		// iter2.next() is called first but is waiting on dependencies to finish.
		// iter1.next() completes the dependency and is able grab the final system.
		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
		]);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
	});

	it('does not run callbacks in whenReady queue when iterating', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		for (let i = 0; i < 4; i++) {
			exec.add(i);
		}

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		await iter1.next();
		await iter2.next();
		await iter2.next();

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: undefined, done: true },
			{ value: 3, done: false },
		]);

		const spy = vi.fn();
		exec.onReady(spy);
		expect(await iter1.next()).toStrictEqual({
			value: undefined,
			done: true,
		});
		await Promise.resolve();
		expect(spy).not.toHaveBeenCalled();
	});
}
