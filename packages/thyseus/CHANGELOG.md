# Thyseus Changelog

## 0.18.0

### Minor Changes

-   Removed `Commands`
-   Removed `EntityCommands`
-   Removed `applyCommands`
-   Removed `Entity.p.index`
-   Removed `Entity.p.generation`
-   Changed `Entity.p.id` from `bigint` to `number`
-   Removed `Entity.p.is()`
-   Removed `EventReader.p.clear()`, `EventWriter.p.clearImmediate()`
-   `EventWriter.p.clear()` now immediately clears the queue.
-   Renamed `SystemRes<T>` to `Local<T>`
-   Modified `Entities` methods

### Patch Changes

-   Added `World.p.spawn()`
-   Added `Entity.p.add()` `Entity.p.addType()`, `Entity.p.remove()` and
    `Entity.p.despawn()` methods
-   Added `Entity.p.has()`
-   Added `applyEntityUpdates` system
-   Added `entityUpdateTiming: 'before' | 'after' | 'custom'` to World config
-   Added `clearAllEventQueues` system
-   Classes used with `Res<T>` and `Local<T>` are no longer required to have a
    static `fromWorld()` property
-   Unused filters are now tree-shakeable

## 0.17.0

### Minor Changes

-   c3b1e9d: Remove Read<T>, ReadModifier

### Patch Changes

-   94ff144: Add Query.p.single() method
-   94ff144: Add Query.p.get() method
-   9a82f6d: Fix bug preventing Without from working
-   fa1f571: Allow Maybe<T> in queries for optional queries
-   9a82f6d: Add dev-only error for non-returning fromWorld methods
-   8c20ecf: Permit async plugins, await promises before building system
    parameters
-   9bcc7a8: Add Query.p.pairs()
-   fa1f571: Add dev-only warning if applyCommands is not added to the world
-   2197c39: Add forEach and reduce methods to queries

## 0.15.0

### Minor Changes

-   Removed `eventReaders` from World
-   Removed `eventWriters` from World
-   Removed `registerEvent()` on Worldbuilder
-   Added `register()` to WorldBuilder
-   `async initialize()` on resources will no longer be called
-   Added `And` filter
-   Query Filters no longer accept tuples as arguments; must use explicit `And`
    instead
-   `Or`, `And`, `With`, `Without` may accept up to four generic arguments.

### Patch Changes

-   Fixed bug preventing struct resources initializers from working correctly

## 0.14.0

### Minor Changes

-   Modify EventWriter.prototype.create() signature to be identical to
    EventWriter.prototype.createFrom(); remove
    EventWriter.prototype.createFrom()
-   Change @struct to a no-op
-   Differentiate AddComponent and AddComponentType commands
-   Remove Query.prototype.forEach
-   Remove @struct fields
-   Remove initStruct
-   Expose numeric types
-   Add Entity.prototype.is
-   Default isMainThread to true if only one thread is used
-   Expose serialize/deserialize/drop string/array
-   Remove dropStruct
