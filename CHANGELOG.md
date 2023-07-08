# Changelog

## 0.13.2

### Patch Changes

-   Fix dependencies not working correctly

## 0.13.1

### Patch Changes

-   821d5bb: Fix strings being mainthread-only
-   821d5bb: Fix Vecs clearing memory incorrectly

## 0.13.0

### Minor Changes

-   66bdf49: Change signature of get(), getById(), and spawn() methods
-   745fb57: Define copy/drop functions for structs rather than pointer array
-   c390f4d: Flatten Memory.views into Memory
-   66ba4cb: Privatize most fields on WorldBuilder
-   f5874ba: Rewrite Commands to use structs, add push() method
-   66bdf49: Remove commands API from Entity
-   c50508d: Remove implicit dependencies (first, last)
-   43e0276: Add World.prototype.getComponentId
-   66bdf49: Remove insertInto(), insertTypeInto(), removeFrom() methods on
    Commands
-   ee25756: Remove /types import, setup /global import

### Patch Changes

-   bb74461: Does not add known no-op commands to the command queue
-   745fb57: Sort components by alignment (largest -> smallest)
-   ea2af62: Fix free not clearing last couple bytes of block

## v0.12.0

### 💥 Breaking Changes

-   `WorldBuilder`
    -   Removed `addSystem()`
    -   Removed `addStartupSystem()`
    -   Removed `setExecutor()`
    -   Removed `registerThreadChannel()`
-   `World`
    -   Removed `update()`
    -   Renamed `archetypes` to `tables`
-   `Table`
    -   Instances are no longer constructed on threads
    -   Renamed bitfield to archetype
    -   `grow()` accepts a `newSize` parameter, to individual tables can grow
        differently.
-   `ThreadGroup`
    -   Changed send to `send(channelName: string, data: SendableType)`
-   Removed `definePlugin()`
-   Removed `defineSystem()`
-   Removed `SystemDefinition`
-   `applyCommands()` is now a function (prev. `SystemDefinition`)
-   Previous "Startup systems" (now systems in the startup core schedule) do not
    run when `worldBuilder.build()` is called, but when `world.start()` is
    called
-   The `memory` option of world config has been renamed to `memorySize`
-   The `Entity` component will throw an error if trying to construct it without
    `world.commands` and `world.entities`
-   Renamed `table.size` to `table.length`
-   `applyCommands` is no longer added by default.

### ✨ Features

-   Added schedules
-   Added `run()` export
-   Added `cloneSystem()` export
-   Added `CoreSchedule` export
-   `WorldBuilder`
    -   Added `addSystems(...systems: System[]): WorldBuilder`
    -   Added
        `addSystemsToSchedule(schedule: symbol, ...systems: System[]): WorldBuilder`
    -   Added `setDefaultExecutor(executor: ExecutorType): WorldBuilder`
    -   Added
        `setExecutorForSchedule(schedule: symbol, executor: ExecutorType): WorldBuilder`
-   `World`
    -   Added `start(): void`
    -   Added `runSchedule(schedule: symbol): Promise<void>`
    -   Added `getResource<T extends Class>(resourceType: T): InstanceType<T>`
-   `Entity`
    -   Added `hasComponent(componentType: Struct): boolean`
-   Added `isMainThread: boolean` and `useSharedMemory: boolean` world config
-   Exposed `thyseus/types` as possible import
-   Exposed `thyseus/descriptors` as possible import
-   Exposed nearly all internal types
-   Exposed `memory` API

### 🐛 Bug Fixes

-   Fixed struct system resources not constructing properly on threads.

### 🔧 Maintenance

-   Updated build to preserve identifiers.

## v0.11.0

### 💥 Breaking Changes

-   The `size` property on `Query` instances has been renamed to `length`.
-   Removed `__$$s` property from struct instances - structs now use
    `memory.views` and allocate when they are constructed.
    -   **_All_** structs that are not managed by Thyseus (i.e., that you
        construct yourself with `new YourStruct()`) will need to call
        `dropStruct()` when they go out of scope.
    -   Structs cannot be created before memory has been initialized.
    -   If you're having trouble migrating old code after this schange, please
        feel free to
        [open an issue](https://github.com/JaimeGensler/thyseus/issues/new/choose).
-   `commands.spawn()` and `commands.getEntityById()` return an instance of
    `EntityCommands` instead of an `Entity` component.
    -   `EntityCommands` does _not_ have getters for generation and index -
        otherwise, this change has no impact.
-   `world.resources` has changed from a map of classes to instances
    (`Map<Class, object>`) to an array of instances (`object[]`).
    -   This does not impact you unless you access `world.resources` directly.

### ✨ Features

-   Added Events!
    -   Events are useful for cross-system communication. They can be used with
        two new system parameters - `EventReader<T>` and `EventWriter<T>`, which
        are generic over structs.
    -   `EventWriter` can push events to the event queue, and `EventReader` can
        read events from the queue.
    -   Check the docs page for full documentation.
-   Added `query.forEach()`.
    -   For those that prefer a functional approach to iteration - provide a
        callback, which will be called once for each queried entity.
    -   The callback receives as many arguments as components were queried for,
        so there is no difference between queries for single components vs.
        queries for multiple components.

### 🐛 Bug Fixes

-   Fixed struct resources not being constructed correctly and added a test for
    it this time :)
-   Fixed `SystemRes` constructing on worker threads even if resources were
    main-thread-only.

### 🔧 Maintenance

-   Switch to `tsup` for type bundling.
-   Query `for...of` iteration has been cleaned up a bit and should not create
    objects
-   Reduced default memory size to 64 MB - the original default (512MB) was way
    too aggressive. May be reduced further or slightly bumped in the future.

## v0.10.0

Introducing a new strategy for handling memory, which allows dynamically sized
types! So far, this is only used for internal storage (like `Entities` and
`Table`s) and the new version of `@struct.string`, but it has many future
applications as well!

### 💥 Breaking Changes

-   `@struct` and primitive struct decorators are now plain decorators rather
    than decorator factories.
    -   They should now be called as `@struct` rather than `@struct()`,
        `@struct.u32` rather than `@struct.u32()`, etc.
-   `@struct.string` is now a plain decorator and no longer accepts arguments
    -   See features for more details.
-   Remove `buffer`, `createBuffer()`, and `tableLengths` from `World`
    instances; `archetypeLookup` is now private.
-   Changes to `Entities`, `Table` properties/methods.
    -   This does not impact you unless you access Entities/Tables directly.
-   Changes to some properties/methods on `Commands`.
    -   This is unlikely to impact you - the common-use API remains the same.
    -   Certain methods that were previously technically available but meant for
        internal use like `getData()` have been removed/replaced.
-   Static `schema` on structs removed - stores always contain all elements.
    -   This does not impact you unless you depend on the schema property being
        present.
-   The new memory allocation strategy currently throws when out of memory.
    -   This is unlikely to impact you, and can be remedied by adjusting the
        amount of memory allocated with config - see below for more details.
-   `commands.despawn()` now returns void rather than `this`.
-   `commands.get()` has been renamed to `commands.getEntityById()`.

### ✨ Features

-   Implemented a new memory allocation strategy that allows dynamic sizing.
    -   Many features of this update are only possible because of this new
        strategy!
    -   While we eventually intend to expose this API, working directly with the
        memory allocator is very tricky and can lead to memory corruption. Until
        the API has stabilized more and better memory safety strategies are
        developed, it will remain a private API.
    -   The implementation of this allocator is a first draft - please file an
        issue if you run into any errors, odd behavior, or poor performance.
-   `@struct.string` now creates dynamically sized strings and behaves more or
    less equivalently to normal Javascript strings!
    -   This requires caution when constructing/setting strings in structs you
        manage, and can lead to memory leaks if not careful.
        -   Better strategies to prevent leaks are being worked on, and should
            show up in a future update.
        -   For the time being, we've exported a
            `dropStruct(instance: object): void` function, which you should call
            with structs that (1) you constructed, (2) use strings, and (3) go
            out of scope and are suitable for garbage-collection.
-   Added `SystemResource` system parameter.
    -   These work like resources, but are unique per system, rather than per
        world. As a result, the same type can be reused across multiple systems
        and will create unique instances per system!
    -   `initialize` methods will be called on the main thread only and may be
        async, just like their world resource counterparts.
-   Added an optional `memory` property to world config, which specifies the
    total amount of memory (in bytes) that should be reserved for all worlds.
    -   By default, reserves 512 MBs (1/2 GB). Max allowed by Thyseues is 4GB,
        but your particular environment may not allow this allocation!
    -   **Currently, all worlds share the _same memory_, and so this should be
        the amount of memory you need for _all worlds!_**
    -   This memory is allocated when the first world is built.
    -   This is _not_ the total amount of memory used by your program, but
        rather storage used by entities, components, resources, and Thyseus
        internals.
-   `intoArgument` method of system parameters may return a promise, which will
    be awaited during world building.

### 🐛 Bug Fixes

-   Fixed entities not being recycled correctly.
-   Fixed resources not being constructed correctly in workers.
-   Fixed some data not being transfered between threads correctly, resulting in
    command queues not clearing.
-   Fixed issue caused by thread group recycling `send` results for single
    threaded worlds, resulting in commands being processed multiple times.
-   Fixed command queues growing unnecessarily.

### 🔧 Maintenance

-   Added explicit return types for functions/methods, which should help prevent
    accidental breaking API changes.
-   Improved error messaging when adding/removing unregistered components.
-   Add some additional types to exports (`Plugin`, `WorldBuilder`,
    `WorldConfig`) - more to come in future updates.
-   Specified `config` in `WorldBuilder` and `World` as read-only.

## v0.9.0 (January 25, 2023)

This update adds some much-needed features for structs and components! While
these features mark a "useable" baseline for Thyseus, there's still a lot of
features, cleanup, and performance/DX improvements to come!

### 💥 Breaking Changes

-   Removed `__$$i` from struct instances.
    -   This index property was only an unnecessary indirection over the byte
        offset (`__$$b`), which is what should always be used now.
    -   This only impacts you if you have handwritten structs or have code
        accessing this property.
-   Structs no longer receive `store`, `index`, and `commands` arguments. See
    features for details!
    -   This only impacts you if you have handwritten structs.
-   Removed `entity.insert()`, modified signature of `commands.insertInto()`.
    See features for details!
-   (_Types only_) Removed `maxEntities` config & validation.
    -   This config has been unused for a few updates and there are no plans to
        reintroduce it.

### ✨ Features

-   You can now add your own constructors for structs, allowing you to construct
    them anytime and set initial values!

    -   Added `initStruct(structInstance: object): void` export. If you pass
        `this` to initStruct in your constructor, you may safely read/write
        properties of your struct.
    -   Constructors must not have any required arguments.
    -   You can specify the default values of a struct this way. These values
        will be used as the initial component values any time a component is
        added to an entity _by type_. The below example demonstrates a `Vec3`
        component with `x`, `y`, and `z` defaulting to 1, 2, and 3.

    ```ts
    import { struct, initStruct } from 'thyseus';

    @struct()
    class Vec3 {
    	@struct.f64() declare x: number;
    	@struct.f64() declare y: number;
    	@struct.f64() declare z: number;

    	constructor(x = 1, y = 2, z = 3) {
    		// Treat this kind of like super -
    		// Must be called before accessing properties!
    		initStruct(this);

    		this.x = x;
    		this.y = y;
    		this.z = z;
    	}
    }
    const a = new Vec3(); // x = 1, y = 2, z = 3
    const b = new Vec3(5.5, -2, 7); // x = 5.5, y = -2, z = 7
    ```

    -   If you do not create a constructor with default values, values will
        default to 0.
    -   Structs you create cannot be recycled by Thyseus, so be aware that they
        may add additional garbage collection work.

-   Added `entity.add()` and `commands.insertInto()`, which accept _instances_
    of structs.
    -   This allows you to set initial values for component data, either from
        another entity's component data or by constructing a new component
        instance and passing it.
    -   Values are _immediately copied_ from the passed object so modifications
        after adding a component are not reflected.
-   Added `entity.addType()` and `commands.insertTypeInto()`
    -   These function the same as the previous `insert` and `insertType`.
-   `commands.spawn()` now returns a _unique_ `Entity` handle that may be safely
    used for the rest of the system.
    -   The current implementation adds some additional garbage collection
        work - in the future, this may be reworked to reuse `Entity` instances
        while respecting this guarantee.

### 🐛 Bug Fixes

-   Fixed issue where commands would occasionally not correctly despawn entity
    if despawn was queued after insert in multithreaded worlds.

### 🔧 Maintenance

-   Changed `System` return types from `void` to `any`. Internally, system
    returns are treated as `Promise<void>`, but these types can create some
    annoying Typescript errors - especially if using `Promise.all()` - and so
    have been relaxed to `any`.
-   Bump dev dependency versions.

## v0.8.0 (January 14, 2023)

This update prioritizes some necessary cleanup and stability improvements, and
so is a bit light on features and heavier on breaking changes. As part of this
cleanup, worlds use less memory and bundles should be smaller (especially in
production builds)!

### 💥 Breaking Changes

-   The Dependency API has changed:
    -   `defineSystem` returns an instance of the new `SystemDefinition` class.
    -   `addSystem` only accepts one argument - a `SystemDefinition`.
    -   `SystemDefinition` instances have
        `before(...others: SystemDefinition[]): this`,
        `after(...others: SystemDefinition[]): this`, `beforeAll(): this`, and
        `afterAll(): this` methods. These are now how you declare dependencies.
        -   Dependencies behave the same as before (see
            [v0.2.0 changelog](#v020-july-31-2022) for a refresher).
    -   When a system is added to the world, its dependencies are cleared. This
        allows systems to have different dependencies across worlds.
        -   For this reason, it is recommended that you either declare
            dependencies when you add systems to a world, or in the same module
            you build a world.
    -   As before, dependencies remain unused for startup systems, though this
        will likely change in the future.
-   `WorldBuilder`'s `registerThreadChannel` method and `ThreadGroup`'s `send`
    have been modified.
    -   A `createThreadChannel` function is now exported. This function accepts
        a channel name (string) and a message handler creator - just like the
        previous `registerThreadChannel` function signature.
    -   `registerTheadChannel` now accepts a single `ThreadMessageChannel`
        argument, which is the value returned by `createThreadChannel`.
    -   The `send` method on `ThreadGroup` now accepts a single `ThreadMessage`
        argument, which is created by calling your thread message channel with
        the data you want to send.
    -   This new API has much more robust type safety - the types of the data
        sent to threads and the data returned are intrinsically linked.
-   All validation now only occurs in development builds.
    -   This currently includes:
        -   Validation of world config.
        -   Validation preventing direct access of ZSTs.
        -   Validation that queries have some possible match criteria.
        -   Validation that system dependencies are not circular.
    -   Most validation prevents more cryptic errors from being thrown later,
        but some (e.g. queries that do not match) are silent.
    -   This change only impacts you if you have significant differences between
        your world in prod vs. development, **which should not be the case!**
-   Partial rewrites of `Entities`, `Table`.
    -   This only impacts you if you directly access properties/methods!
-   `world.archetypes` is now a `Table[]` (previously `Map<Bigint, Table>`).
-   `world.systems` is now a `((...args: any[]) => any)[]`
    -   Worlds now also have `arguments: any[][]`, so each system has a
        corresponding member in the arguments array (incl. empty arrays).

### ✨ Features

-   Added `esm-env` as a dependency.
    -   This allows Thyseus to check whether you're building for development or
        production. We'll use more of these checks in the future to provide
        better correctness guarantees in dev and better performance in prod!
-   Added `isAlive(entityId: bigint)` to `Entities` (`world.entities`), if you
    need to check if an entity is still alive.
-   Added `clone(): SystemDefinition` method to `SystemDefinition`.
    -   Useful if you need to add multiple instances of the same system (e.g.,
        if you'd like to add an additional `applyCommands` system in the middle
        of your update loop).
    -   `clone` does not clone dependencies or dependents. It's a completely new
        system with the same functionality!
-   Dependencies are now recursively validated.
    -   Previously, errors were only thrown if dependencies were directly
        circular (e.g., `A before B before A` or `A before A`).
    -   We now detect chains of dependencies and throw for those (e.g.
        `A before B before C before A` will throw).
-   Added `setExecutor(executor: ExecutorType)` method to `WorldBuilder`, so you
    may pass a custom executor implementation.
    -   Custom executors are an especially advanced pattern - some documentation
        around API requirements has been added.
-   Added `SimpleExecutor`, which is automatically used in single-threaded
    worlds.
    -   `SimpleExecutor` currently performs much better than `ParallelExecutor`.

### 🐛 Bug Fixes

-   Fixed bug where Executors could get into a bad state that prevented system
    execution.
-   Fixed types for `Query` iterators.
-   Fixed issue where commands could be added for despawned entities, causing
    entities with recycled ids to incorrectly add/remove components.
-   Fixed entities not being correctly despawned.
-   Fixed Commands not properly creating `Entity` stores, preventing access to
    entity `index` and `generation` for (spawned) entity handles.
-   The promise returned by `world.update()` now (correctly) only resolves when
    all systems have finished executing.
-   Fixed a rare bug where `beforeAll`/`afterAll` could introduce undetected
    circular dependencies.
-   Fixed bug where using more than 2 threads would cause unresolveable promises
    and prevent worlds from being built.

### 🔧 Maintenance

-   Bump dev dependency versions.

## v0.7.0 (December 11, 2022)

Query improvements are here, with a [docs](./docs/queries.md) page too!

### 💥 Breaking Changes

-   The value returned by `Mut()` has changed from an array to an instance of
    the new `Mut` class.
    -   This does not impact you unless you directly accessed the return of
        `Mut()`.
-   Trying to use zero-sized ("tag") components as accessors in queries will
    throw during system construction now.
    -   With the new filters feature for queries, the correct way to query for
        ZSTs is to specify `With(MyZST)` / `Without(MyZST)`.
    -   Previously, this would cause errors to be thrown downstream anyway.
        We're forcing this error to happen earlier to highlight that this is an
        invalid use and to offer a clearer resolution.

### ✨ Features

-   **_Query Filters!_** The `Query()` parameter now permits a second argument
    that can be used to specify additional filters on queries. These filters are
    available on the parameters object provided by `defineSystem`, and are only
    permitted in the second argument of the `Query()` descriptor function.
    -   `With()` - specifies that queried entities must have a specific
        component.
        -   Accepts structs or tuples of structs as arguments.
    -   `Without()` - the opposite of With. Matched entities will **_not_** have
        the specified component.
        -   Acccepts structs or tuples of structs as arguments.
    -   `Or()` - allows more complex querying logic, where multiple conditions
        may be permitted.
        -   Accepts two arguments.
        -   Arguments must be instances of `With`, `Without`, `Or`, or tuples of
            those items.
    -   **And** - tuples of any size (`[ComponentA, ComponentB, ...]`) specify
        "And" clauses.
    -   Some additional notes:
        -   Filters do not grant access to components and do not impact whether
            systems can run in parallel.
        -   With the exception of `Optional()`, accessors are processed as
            `With` clauses automatically and do not need to be added to the
            filter list.
        -   Queries are validated and will remove impossible combinations of
            filters. If no valid filters remain, an error will be thrown. For
            example:
            -   `[With(A), Without(A)]` will throw.
            -   `[Or(With(A), With(B)), Or(Without(A), Without(B))]` will not
                throw, and will simplify to expect `(A && !B) || (!A && B)`
                (removing the logically impossible `(A && !A) || (B && !B)`).
-   Added `Optional()` to parameters object, accepted by `Query()` parameters
    (only permitted in first argument).
    -   Use `Optional()` if you want access to a component _only if_ an entity
        contains it. Optional has no affect on query matches (both entities with
        and without the component will match the query).
    -   Iterating queries with `Optional()` will yield an instance of the
        component if it exists, or `null` if not.
-   Queries no longer have to be tuples - if you need a single item, you can use
    `Query(MyComponent)` and the iterator will yield plain `MyComponent`
    instances.
-   Nested query iteration now works!
    -   Previously, queries held a single instance of elements, which meant that
        nesting query iterators would override other element values. Now,
        invoking the iterator guarantees new instances.
-   Added `size` to `Query` instances, a getter that returns the number of
    entities that currently match.
-   `executor` on worlds is now public.

### 🔧 Maintenance

-   Bump Typescript version.

## v0.6.0 (November 18, 2022)

Structs just got a lot more powerful!

### 💥 Breaking Changes

-   The `store` and `index` properties on `ComponentType` instances have been
    renamed, freeing up store and index as useable field names.
    -   This change does not impact you unless you directly access either of
        those properties.
    -   The new names are `__$$s` for store,`__$$i` for index, and `__$$b` for
        the new byteOffset property (these may move to symbols in the future).
        -   If you write your own accessors, you must use byte offset if you
            want your struct to function with `@struct.substruct()`
-   `entityIndex` on `Entity` has been changed to `index`.
-   Static properties for struct classes have changed.
    -   This change does not impact you unless you have handwritten Components -
        i.e., without use of `@struct`.
    -   `alignment` - the number of bytes needed by the largest field of the
        struct (e.g. 8 for `f64`, `i64`, `u64`, 4 for `f32`, `i32`, `u32`,
        etc.).
        -   Array/string alignment is the same as individual field alignment
            (e.g., an `i32` and an `Int32Array` have the same alignment).
    -   `size` - the size of the type _including padding_ (previously did not
        include padding). **Must be a multiple of alignment.**
    -   `schema` - a **_numeric_** (bitfield) property indicating which
        TypedArrays are needed when creating a store.
        -   Bit flags start with `u8 = 1 << 0`, and are ordered
            `u8 ... u64, i8 ... i64, f32, f64`.
-   The shape & memory layout of component stores has changed.
    -   This change does not impact you unless you directly access component
        store data (like `world.archetypes`) or have handwritten accessors on
        components.
    -   Previously, component stores would allocate a buffer and each field
        would claim a section of the buffer (e.g. `|x---|y---|z---|` for a store
        of `Vec3` components). Now, components are placed sequentially in the
        buffer (e.g., `|xyz|xyz|xyz|`).
        -   Stores are now objects containing the `buffer`, a Uint8Array (`u8`)
            over the (entire) buffer, and any other typed arrays specified by a
            struct's `schema` over the entire buffer.
    -   Benchmarks suggested this was a significantly more performant approach -
        _both_ for iteration and for copying component data such as growing
        stores, moving tables, and (in the future) setting initial values.
    -   Please note that if you do access component data directly, fields are
        reordered as necessary (by alignment, largest to smallest, equal
        alignments appended), and so may or may not be in the same order as
        declared.

### ✨ Features

-   Added `@struct.string()` for fixed-size strings.
    -   This decorator factory accepts an options object, containing either:
        -   `characterCount: number` allocates _enough space for `n`
            **three-byte** characters_ - if any characters use fewer than three
            bytes, more characters will be able to fit.
        -   `byteLength` specifies how many bytes the string takes up. If you
            know you'll only be using one or two byte characters, you can reduce
            the required storage space of the string.
        -   byteLength is used if both are set.
    -   Unlike normal Javascript strings, `'\u0000'` characters terminate the
        string.
    -   Please note that the current implementation uses dynamic typed array
        creation, and so is much slower than primitive numeric fields.
-   Added `@struct.array()` for fixed-size numeric arrays.
    -   This decorator factory accepts an options argument with two required
        fields:
        -   `type` - The name of the array type (e.g. `'u8'`, `'i16'`, `'f64'`,
            etc.)
        -   `length` - The length (in elements) of the array.
    -   Please note that the current implementation uses dynamic typed array
        creation, and so is much slower than primitive numeric fields.
-   Added `@struct.substruct()`, so structs can have _other structs_ as
    properties.
    -   This decorator factory accepts a struct.
    -   Creates both a getter and a setter.
    -   The current implementation dynamically creates instances of the provided
        struct, and so is much slower than primitive numeric fields. In the
        future this will be refactored to take advantage of a per-thread
        struct-instance pool.
-   It is no longer required that `getNewTableSize` return multiples of 8.
    -   As a result, resources create a store of size 1, rather than using
        `getNewTableSize(0)`

### 🐛 Bug Fixes

-   Fixed issue where table stores wouldn't re-pack data correctly when moving
    to tables with fewer components.
-   Fixed a bug where new components would initialize with old component data.
    -   The current implementation eagerly zeroes data when components move -
        this will likely be done lazily in the future, so if you manually access
        component data, do not rely on eager zeroing.
-   Fixed tables not correctly sharing metadata between threads.
-   Prevent columns from being created for ZSTs in tables.

### 🔧 Maintenance

-   Cleanup type names (`ComponentType` -> `Struct`)
-   Bumped dev dependency versions.

## v0.5.0 (October 29, 2022)

This update is heavy on breaking changes and light on features - primarily
focused on internal cleanup & moving forward with a better API. Exciting feature
work coming soon!

### 💥 Breaking Changes

-   Removed `Component()` function and `Type` enum - replaced with `@struct()`
    decorator (check the [README](./README.md) for updated API reference).
    -   The primary motivation for this change was that, for this use case,
        decorators:
        -   Better demonstrate intent
        -   Have clearer fields at a glance
        -   Allow components to be declared without extending a class
        -   Are more flexible for future features
    -   Additionally, thyseus will eventually have an optional TS compiler to
        provide better performance & DX, and decorators will likely be easier to
        work with for this.
    -   Unfortunately, current Typescript decorators do not provide outstanding
        type information. The current implementation will be updated to the new
        decorators proposal once Typescript adds support, which will hopefully
        provide better type info.
-   Removed `ThreadProtocol`, `Resource()` function (resources should be
    declared with `@struct()` like components)
    -   This was primarily to unify around a single model of shared data.
    -   Additionally, ThreadProtocol had some less than ideal performance
        characteristics that impacted all values sent across thread boundaries.
        Without it, transfering data across threads should be much faster.
-   Static `create()` methods on Resources will not be called anymore. See
    features for the replacement API, which allows async initialization and
    access to private class members.
-   The first argument of `defineSystem()` is now a function that is passed an
    object containing descriptors (`P`) as well as `Mut`.
    -   This reduces the amount of top-level API, and marks a step towards
        making the TS compiler mentioned above easier to build.
-   Removed `P`, `Mut` exports, moved `World` from default to named export.

### ✨ Features

-   Resources with an `initialize(world: World): void | Promise<void>` method
    (**not** static) will have that method called immediately after the world is
    created (before the `WorldBuilder.build()` promise resolves).
    -   `initialize` is only called on the main thread, so context-sensitive
        operations like setting up event listeners can be done here.
-   Add `registerThreadChannel()` method to `WorldBuilder`.
    -   Pass a channel name (`string`) and a handler _creator_
        (`(world: World) => (data: SendableType) => SendableType`).
    -   Channels must be **unique** - one channel may only have one handler.
-   Nearly all properties on `World` and `WorldBuilder` are public now.
    -   While mutating World properties directly is rarely a good idea, not
        letting users access World internals seemed like a worse idea.
-   Component fields can be booleans with `@struct.bool()`.
    -   At the moment, this is just a wrapper around `@struct.u8()`, so bool
        fields require an entire byte (may be reworked in the future).
-   The internal `Executor` for systems has been slightly rewritten and no
    longer users `Atomics.waitAsync`.
    -   This marks multithreading capabilities on all browsers that support
        `SharedArrayBuffer` and module Workers, and no longer requires
        `SharedArrayBuffer` when singlethreaded! 🎉
    -   In a near update, Worlds will accept custom executors, so while the
        default Executor will always aim to work in (nearly) all runtimes out of
        the box, if `Atomics.waitAsync`/`Atomics.wait`/another approach is
        better for your use case, a custom implementation could be swapped in.

### 🐛 Bug Fixes

-   Fixed promises returned by systems not being awaited by the executor.
-   Fixed tables not retaining new columns after grow.

### 🔧 Maintenance

-   Bumped dev dependency versions.

## v0.4.0 (October 22, 2022)

### 💥 Breaking Changes

-   Some elements of `WorldBuilder` and `World` have changed.
    -   `components` on World is now a `ComponentType[]`.
    -   `queries` on **World** is now a `Query[]`.
    -   `queries` and `registerQuery` on **WorldBuilder** have been removed. At
        the moment, queries do not need to be pre-registered.
-   Some properties previously available on `WorldCommands` no longer exist. All
    methods remain the same.
    -   It is _strongly suggested_ that you do not access properties on
        `WorldCommands` and only use its methods, as the internal implementation
        of `WorldCommands` is likely to continue to change (pre-1.0).
-   Some properties previously available on `Query` no longer exist. Iteration
    remains the same.
    -   Namely, queries no longer need to track which entities match them, and
        so have no `entities` field.
    -   As above, it is strongly suggested that you simply iterate over query
        instances, as the rest of the properties are subject to change.
-   `threads` on `World` have been changed from `Thread[]` to `ThreadGroup`.
    -   Some of the functionality of ThreadGroup will be expanded to be
        consumer-facing in a future update.

### ✨ Features

-   Now uses
    [archetypes](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
    for component storage! As a result, **_memory usage is significantly
    reduced_**, and iterating queries should be more cache-friendly.
    -   Archetypes can be accessed with `world.archetypes`
        (`Map<bigint, Table>`).
    -   Bear in mind that archetypes may be somewhat slower at the moment than
        the previous storage mechanism - especially adding/removing Components -
        but have the potential to be much faster - more benchmarking around the
        bottlenecks of the current implementation is needed, first.
-   Entities are now a _generational_ index.
    -   Every entity has an associated generation. Whenever an entity is
        despawned, the generation is incremented.
    -   Entity data can be queried for with the `Entity` component (all living
        entities have this component, so it does not affect what a query
        matches).
    -   The `Entity` component has no setters and includes a few methods that
        can be used to queue components for add/remove, or to despawn the
        entity - `WorldCommands.spawn()` returns an Entity component! These
        methods do not require a lock, and so **_Entity can (and should) be
        accessed immutably_**.
        ```ts
        class Entity {
        	get id(): bigint; // uint64
        	get generation(): number; // uint32
        	get entityIndex(): number; // uint32
        	insert(Component: ComponentType<any>): this;
        	remove(Component: ComponentType): this;
        	despawn(): void;
        }
        ```
-   Added `getNewTableSize: (prev: number) => number` to world config, which
    determines how archetype tables grow. By default, 8 entities are allocated
    for a table, and table size is doubled each grow.
    -   When creating a new table, the `prev` argument will be 0.
    -   _Returned values **must** be multiples of 8_ - failure to do so will
        result in undefined behavior!
-   Systems can now return promises, which will be `await`ed before continuing
    system execution on that thread. This should not be utilized often, as any
    data a system locks will remain locked until the promise is resolved!

### 🔧 Maintenance

-   Bumped dev dependency versions.

## v0.3.0 (September 11, 2022)

### 💥 Breaking Changes

-   Single-threaded worlds use the same executor as multithreaded worlds. As a
    result, they will respect passed dependencies. Unfortunately, they now
    require `Atomics.waitAsync` - this will be resolved in a future release.
-   Components can no longer be used as Resources (i.e.,
    `class MyResource extends Component({ ... }) {}` no longer works as
    expected). The `Resource()` function is now provided to serve this purpose.
    `Resource()` is nearly identical to `Component()`, but requires a schema.
-   `EntityManager` has been replaced with `WorldCommands` - see below for
    details. Systems using `P.Entities()` must be updated to `P.Commands()` and
    the new Commands API.
-   The `Thread` class is no longer exposed (not intended for consumer use). To
    access the `Send` and `Receive` symbols, you can instead
    `import { ThreadProtocol } from 'thyseus'`.

### ✨ Features

-   New `Commands` API!
    -   Commands can be accessed on any thread, and is disjoint with all other
        parameters - **_including itself_**.
    -   Commands functionally queues modifications to entities - updates to
        queries occurs in a system that intersects with all other systems. If
        you need systems to run _after_ entity modification, you can
        `import { applyCommands } from 'thyseus'` and specify it as a
        dependency. Be aware that for multithreaded worlds, doing so will create
        a hard sync point. Last, WorldBuilders always add the `applyCommands`
        system - you don't need to add it yourself.
-   New minimal plugin API!
    -   Plugins are just functions that accept a WorldBuilder instance. They can
        add systems to the world just as normal, and are useful for creating
        shared groups of systems that may depend on eachother.
    -   Add plugins to a world with the `addPlugin` method.
    -   The `definePlugin` function is provided for type help.
-   New `World` system parameter.
    -   This provides direct access to the World and all of its data. It
        intersects with all other system parameters (creating a sync point for
        multithreaded worlds). Systems that access `World` always run on the
        main thread, and can therefore access main-thread-only resources if
        needed.
-   New methods for `WorldBuilder`, and some previously internal properties on
    `World` and `WorldBuilder` are exposed thru getters! Most of these are
    designed for internal use, but could be useful for advanced use cases.
    -   As a result of this and other refactors, user-defined system parameter
        descriptors are now possible. This is a more advanced pattern, and more
        documentation around this will be available in the future.

### 🔧 Maintenance

-   Improved annotations on classes/methods.
-   Cleaned up type names - Component Classes are now `ComponentType`, Resource
    Classes are now `ResourceType`.
-   Major behind-the-scenes refactoring. Overall package size has been reduced!
-   Improved test coverage.
-   Bumped dev dependency versions.

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

-   Improved test coverage.
-   Bump Vite/Vitest version.
-   Use vite library mode to build.

## v0.1.0 (July 2, 2022)

-   Initial release.
