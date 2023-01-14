# Custom Executors

An Executor is responsible for determining how to execute the systems in a
world. This includes respecting dependencies, protecting against intersections,
determining resource locality, and actually calling system functions.

There are a few reasons you may want to use a different executor. Thyseus
actually provides two executors out of the box - `SimpleExecutor` for single
threaded worlds, and `ParallelExecutor` for multithreaded worlds. Single
threaded worlds don't have to worry about concepts such as resource locality or
problems that can arise from running intersecting systems in parallel. As a
result, they can have significantly simpler execution logic. When a world is
built, Thyseus checks if you're using multiple threads or not and picks the
executor to use.

Another reason to use a different executor is if you want to take advantage of a
technology that you know will be available in your environment that the default
executor doesn't use (like `Atomics.waitAsync`). Or, perhaps you want additional
guarantees that the defaults don't provide, like stable execution order. These
become possible by providing a custom executor implementation.

There are many ways to implement a working executor, each with different
difficulties - this page will only cover API requirements and mandatory
functionality.

## Using a Custom Executor

You can specify a world's executor by using the world builder's `setExecutor`
method. This method accepts one argument - an `ExecutorType`, shown below:

```ts
type ExecutorType = {
	fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: SystemDependencies[],
	): ExecutorInstance;
};
type SystemDependencies = {
	dependencies: SystemDefinition[];
	beforeAll: boolean;
	afterAll: boolean;
};
type ExecutorInstance = { start(): Promise<void> };
```

As with most internal APIs, Thyseus implements this as a class:

```ts
class SimpleExecutor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: SystemDependencies[],
	): SimpleExecutor {}

	constructor(/* ... */) {}

	async start() {}
}
```

And as with most APIs, you may choose to implement this however you wish!

> NOTE: The world is still being constructed when `fromWorld()` is called. All
> properties (except executor) have been set, _but not all properties have been
> populated_ (e.g., `world.resources` is accessible but will have no contents).

## ThreadGroup Queues

Because executors are created while the world is being constructed, they are
able to use special `ThreadGroup` functionality that is not normally available.

The `ThreadGroup.prototype.queue()` method accepts a "creator" function that, on
the main thread, calls that function to create a value, adds the value to a
queue, and returns the value. This contents of this queue can then be sent to
worker threads. When this method is called in a worker context, it merely
removes and returns the next value from the queue. This provides a simple way of
propogating values across threads as long as threads are executing the same
code! Because this method requires that threads are executing the same code in
the same order, this method only works during world construction. This is
particularly useful for data structures backed by `SharedArrayBuffer`.

This method depends entirely on the order in which values are created - it is
imperative that you do not wrap `queue` in a context-specific conditional!

Good:

```ts
class MyExecutor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
	) {
		const myBuffer = world.threads.queue(() => world.createBuffer(8));
		// ...
	}
}
```

Bad:

```ts
class MyExecutor {
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
	) {
		if (world.threads.isMainThread) {
			const myBuffer = world.threads.queue(() => world.createBuffer(8));
		}
	}
}
```

## Executor Requirements & Guidelines

For an executor to work, it must:

-   Follow the above API requirements.
-   `start()` must return a promise that only resolves when **all systems finish
    running**.
-   `start()` must call system functions with their arguments.
    -   Built `systems` are available as `world.systems`. Their arguments are
        available as `world.arguments`.
-   Only run each system once.

For an executor to meet Thyseus' executor guarantees, it must:

-   Only run systems on the main thread if it uses thread-bound arguments.
-   Ensure that intersecting systems do not run in parallel.
-   Respect system dependencies.

If you are creating a third-party library that includes a custom executor, your
executors could provide additional guarantees. For example, the default executor
does not guarantee a stable execution order, so systems may be called in
different orders frame to frame (assuming no dependencies). Your executor could
choose to construct a single execution order, and guarantee that your systems
are always called in order.

Technically, you also have the option to break Thyseus' execution guarantees,
such as ignoring dependencies or intersections. If you do so, you should denote
exactly how you break these guarantees for consumers!
