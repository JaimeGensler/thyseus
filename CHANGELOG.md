# Changelog

## v0.2.0 (July 31, 2022)

### 💥 Breaking Changes

-   `defineSystem()` now returns an object rather adding a `parameters` property
    to the provided function. As a result, the same function can be re-used for
    multiple systems.

### ✨ Features

-   You can now specify dependencies between systems to force a specific
    execution order! The `addSystem()` method now accepts an optional second
    argument, which can be used to specify if a system must execute before/after
    other systems.

    ```ts
    const updateTime = defineSystem(/* ... */);
    const handleInput = defineSystem(/* ... */);
    const mover = defineSystem(/* ... */);
    const draw = defineSystem(/* ... */);

    const myWorld = World.new()
    	// Mover will not run until after handleInput has finished.
    	.addSystem(mover, { after: [handleInput] })
    	// A matching before/after pair is permitted but not required.
    	.addSystem(handleInput)
    	// draw will not run until all intersecting systems have finished.
    	.addSystem(draw, { afterAll: true })
    	// updateTime must run before any intersecting systems may run.
    	.addSystem(updateTime, { beforeAll: true });

    // Dependencies look like this:
    interface Dependencies {
    	before?: SystemDefinition[];
    	after?: SystemDefinition[];
    	beforeAll?: boolean;
    	afterAll?: boolean;
    }
    ```

    A few notes on dependencies:

    -   Both explicit (`before`, `after`) and implicit (`beforeAll`, `afterAll`)
        dependencies apply only to systems that intersect. For example, if
        systems `A` and `B` are disjoint, then `A before B` will have no effect.
        Similarly, `A beforeAll` _will **not**_ guarantee that `A` runs before
        `B` (but will guarantee that `A` runs before any other systems that `A`
        intersects with).
    -   Explicit dependencies take precedence over implicit dependencies. Given
        intersecting `A` and `B`, `(B beforeAll), (A before B)` will guarantee
        that A runs before B.
    -   If no explicit resolution is provided, implicit dependencies are
        evaluated _in the order they are passed in_.
        -   Given `(A beforeAll), (B beforeAll)`, `A` will be guaranteed to
            execute before `B`.
        -   Given `(A afterAll), (B afterAll)`, `A` will be guaranteed to
            execute _after_ `B`.
    -   Directly contradictory dependencies - such as `A after A` or
        `(A before B), (B before A)` - will cause an error to be thrown when the
        world is built.
    -   Dependencies apply only to multithreaded worlds for the moment. In the
        future, single threaded worlds will also use dependencies.

-   Resources can now also be made thread-friendly by implementing Thyseus's
    internal Thread Send/Receive protocol (i.e., classes that implement
    `static [Thread.Receive]() {}` and `[Thread.Send]() {}` methods).
    -   Constructors for classes implementing `Send`/`Receive` will be called
        with the world config.
    -   This is the recommended method of defining resources.
-   Resources that are bound to the main thread for initialization, but are
    readable and/or writeable from multiple threads (for example, a `Keyboard`
    resource that needs to register listeners for `keydown`/`keyup` events) can
    implement a static `create()` method that will be used rather than its
    constructor. This method receives the same arguments its constructor would
    be called with (`WorldConfig` for resources implementing Thread protocol, a
    store & index for Component-based resources), and must return an instance of
    the class.

### 🔧 Maintenance

-   Improved test coverage
-   Bump Vite/Vitest version
-   Use vite library mode to build

## v0.1.0 (July 2, 2022)

-   Initial release.
