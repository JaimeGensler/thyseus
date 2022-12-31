import { BigUintArray } from '../utils/BigUintArray';
import { createMessageChannel } from '../utils/createMessageChannel';
import { vecUtils } from './vecUtils';
import { type Dependencies, type SystemDefinition } from '../Systems';
import type { World } from '../World';
import type { ThreadGroup } from '../utils/ThreadGroup';
import { getSystemIntersections } from './getSystemIntersections';
import { getSystemDependencies } from './getSystemDependencies';

export type ExecutorInstance = { start(): Promise<void> };
export type ExecutorType = {
	fromWorld(
		world: World,
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
	): ExecutorInstance;
};

let nextId = 0;
export class ParallelExecutor {
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
						val.parameters.some(param => param.isLocalToThread())
							? acc.add(i)
							: acc,
					new Set<number>(),
			  )
			: new Set<number>();

		const systemVec = world.threads.queue(
			// Storing current length
			() => new Uint16Array(world.createBuffer(2 * systems.length + 2)),
		);
		const status = new BigUintArray(
			systems.length,
			2,
			world.threads.queue(
				() =>
					new Uint8Array(
						world.createBuffer(
							BigUintArray.getBufferLength(systems.length, 2),
						),
					),
			),
		);
		const id = world.threads.queue(() => String(nextId++));

		return new this(
			world,
			intersections,
			dependencyMasks,
			systemVec,
			status,
			local,
			id,
		);
	}

	#resolver = () => {};

	#intersections: bigint[];
	#dependencies: bigint[];
	#systemsToExecute: Uint16Array;
	#status: BigUintArray; // [ SystemsRunning, SystemsCompleted ]
	#local: Set<number>;
	#id: string;
	#systems: ((...args: any[]) => any)[];
	#arguments: any[][];
	#threads: ThreadGroup;
	constructor(
		world: World,
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
		this.#local = local;
		this.#id = id;
		this.#systems = world.systems;
		this.#arguments = world.arguments;
		this.#threads = world.threads;

		this.#threads.setListener('thyseus::defaultExecutor', (val: number) => {
			if (val === 0) {
				this.#runSystems();
			} else {
				this.#resolver();
			}
		});
	}

	async start() {
		this.#status.set(0, 0n);
		this.#status.set(1, 0n);
		for (let i = 0; i < this.#dependencies.length; i++) {
			if (!this.#local.has(i)) {
				vecUtils.push(this.#systemsToExecute, i);
			}
		}
		this.#sendSignal(0);
		return this.#runSystems();
	}

	async #runSystems() {
		const local = new Set(this.#local);
		while (vecUtils.size(this.#systemsToExecute) + local.size > 0) {
			const size = vecUtils.size(this.#systemsToExecute);
			let sid = -1;

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
						sid = systemId;
						if (local.has(systemId)) {
							local.delete(systemId);
						} else {
							vecUtils.delete(
								this.#systemsToExecute,
								this.#systemsToExecute.indexOf(systemId),
							);
						}
						this.#status.OR(0, 1n << BigInt(systemId));
						break;
					}
				}
			});

			if (sid > -1) {
				console.log(sid);
				await this.#systems[sid](...this.#arguments[sid]);

				await navigator.locks.request(this.#id, () => {
					this.#status.XOR(0, 1n << BigInt(sid));
					this.#status.OR(1, 1n << BigInt(sid));
				});
				this.#sendSignal(1);
			} else if (size !== 0 || local.size !== 0) {
				await this.#receiveSignal();
			}
		}
	}
	#sendSignal(val: number) {
		//TODO
	}
	async #receiveSignal() {
		// TODO
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi } = import.meta.vitest;

	const emptyMask = [0b0000n, 0b0000n, 0b0000n, 0b0000n];

	vi.stubGlobal('navigator', {
		locks: {
			async request(_: any, cb: () => void) {
				await Promise.resolve();
				cb();
			},
		},
	});

	const createExecutor = (
		i: bigint[],
		d: bigint[],
		l: Set<number>,
		systems: ((...args: any[]) => any)[],
		args: any[],
	) =>
		new ParallelExecutor(
			{ systems, arguments: args } as any,
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

	it.only('calls a systems when started', async () => {
		const spy = vi.fn();
		const args = [1, {}, 3];
		const exec = createExecutor(
			[0b110n, 0b000n, 0b000n],
			[0b000n, 0b000n, 0b000n],
			new Set(),
			[spy],
			[args],
		);
		await exec.start();
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(...args);
	});

	it('iterates all elements with no intersections, no dependencies', async () => {
		const exec = createExecutor(emptyMask, emptyMask, new Set());
		exec.reset();

		const visited: number[] = [];
		for await (const id of exec) {
			expect(visited).not.toContain(id);
			visited.push(id);
		}
		for (let i = 0; i < 4; i++) {
			expect(visited).toContain(i);
		}
		expect(visited).toStrictEqual([0, 3, 2, 1]);
	});

	it('iterates elements with intersections', async () => {
		const exec = createExecutor(
			// Last element will move to first and so would normally be next,
			// but intersection prevents it from running from happening
			[0b1000n, 0b0000n, 0b0000n, 0b0001n],
			emptyMask,
			new Set(),
		);
		exec.reset();

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();

		let res1 = await iter1.next();
		expect(res1.value).toBe(0);

		// Would normally be 3, but can't because it's held.
		let res2 = await iter2.next();
		expect(res2.value).toBe(1);

		res2 = await iter2.next();
		expect(res2.value).toBe(2);

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: 3, done: false },
			{ value: undefined, done: true },
		]);
	});

	it('iterates elements with dependencies', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0110n],
			new Set(),
		);
		exec.reset();

		const iter = exec[Symbol.asyncIterator]();
		expect((await iter.next()).value).toBe(0);

		// Would normally be 3, but can't because 1 hasn't run yet
		expect((await iter.next()).value).toBe(1);

		// Would normally be 3, but can't because 2 hasn't run yet
		expect((await iter.next()).value).toBe(2);

		expect((await iter.next()).value).toBe(3);

		expect((await iter.next()).done).toBe(true);
	});

	it('does not run callbacks in whenReady queue when iterating', async () => {
		const exec = createExecutor(
			emptyMask,
			[0b0000n, 0b0000n, 0b0000n, 0b0001n],
			new Set(),
		);
		exec.reset();

		const iter1 = exec[Symbol.asyncIterator]();
		const iter2 = exec[Symbol.asyncIterator]();
		await iter1.next();
		await iter2.next();
		await iter2.next();

		expect(await Promise.all([iter2.next(), iter1.next()])).toStrictEqual([
			{ value: 3, done: false },
			{ value: undefined, done: true },
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
